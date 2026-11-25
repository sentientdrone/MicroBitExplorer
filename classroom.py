"""Class Explorer back end: a shared gallery of students' micro:bit builds.

One computer on the school network runs this (the "class server"). Students
join with a class code, share builds and browse their classmates' builds; the
teacher logs in with a password to see everything and moderate.

Storage is plain JSON files in a data folder:
    <data>/class.json            class name, join code, teacher password hash
    <data>/students.json         kid accounts: name + hashed PIN
    <data>/builds/<id>.json      one file per shared build

Kids unlock their account with a 4-6 digit PIN; making a new account needs
the teacher password.
Standard library only.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from pathlib import Path

LIMITS = {"author": 30, "title": 60, "description": 300, "python": 60_000, "blocks": 400_000}
MAX_BODY = 600_000
TEACHER_SESSION_SECONDS = 8 * 3600
STUDENT_SESSION_SECONDS = 8 * 3600
PIN_RE = re.compile(r"^\d{4,6}$")
PIN_TRIES, PIN_LOCKOUT_SECONDS = 5, 60
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I mix-ups when read off a board

# Pages allowed to call this API from another origin: each student's own local copy of the app.
LOCAL_ORIGIN = re.compile(r"^http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def _hash_password(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()


def _new_code():
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


def _clean(value, field, required=False):
    if value is None:
        value = ""
    if not isinstance(value, str):
        raise ApiError(400, f"{field} must be text")
    value = value.strip()
    if required and not value:
        raise ApiError(400, f"please fill in the {field}")
    if len(value) > LIMITS[field]:
        raise ApiError(400, f"{field} is too long (max {LIMITS[field]} characters)")
    return value


class Classroom:
    def __init__(self, data_dir):
        self.dir = Path(data_dir)
        self.builds_dir = self.dir / "builds"
        self.lock = threading.Lock()
        self.sessions = {}          # teacher token -> expiry time
        self.student_sessions = {}  # student token -> (student id, expiry time)
        try:
            self.builds_dir.mkdir(parents=True, exist_ok=True)
            self.writable = True
        except OSError:
            self.writable = False

    # ------------------------------------------------------------ storage
    def _class(self):
        try:
            return json.loads((self.dir / "class.json").read_text())
        except (OSError, ValueError):
            return None

    def _save_json(self, path, obj):
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(obj))
        os.replace(tmp, path)  # atomic: never leaves a half-written file

    def _students(self):
        try:
            return json.loads((self.dir / "students.json").read_text())
        except (OSError, ValueError):
            return {}

    def _student(self, student_id):
        st = self._students().get(student_id or "")
        if not st:
            raise ApiError(404, "that account doesn't exist")
        return st

    def _build(self, build_id):
        if not re.fullmatch(r"[0-9a-f]{12}", build_id or ""):
            raise ApiError(404, "build not found")
        try:
            return json.loads((self.builds_dir / f"{build_id}.json").read_text())
        except (OSError, ValueError):
            raise ApiError(404, "build not found")

    def _all_builds(self):
        out = []
        for p in self.builds_dir.glob("*.json"):
            try:
                out.append(json.loads(p.read_text()))
            except (OSError, ValueError):
                pass
        return sorted(out, key=lambda b: b["created"], reverse=True)

    # ------------------------------------------------------------- auth
    def is_teacher(self, token):
        exp = self.sessions.get(token or "")
        if exp and exp > time.time():
            return True
        self.sessions.pop(token or "", None)
        return False

    def student_for(self, token):
        """The unlocked student account for a token, or None."""
        entry = self.student_sessions.get(token or "")
        if not entry:
            return None
        sid, exp = entry
        st = self._students().get(sid)
        if exp < time.time() or not st:
            self.student_sessions.pop(token, None)
            return None
        return {"id": sid, "name": st["name"]}

    def _teacher_password_ok(self, password):
        c = self._class()
        return bool(c and password) and hmac.compare_digest(_hash_password(password, c["salt"]), c["hash"])

    def _require_teacher(self, token):
        if not self.is_teacher(token):
            raise ApiError(401, "teacher login needed (it may have expired: log in again)")

    def _check_code(self, code, token=None):
        if self.is_teacher(token):
            return
        c = self._class()
        if not c:
            raise ApiError(409, "this server has no class set up yet")
        if not code or not hmac.compare_digest(code.strip().upper(), c["code"]):
            raise ApiError(403, "that class code isn't right")

    def _new_session(self):
        now = time.time()
        for t, exp in list(self.sessions.items()):
            if exp < now:
                del self.sessions[t]
        token = secrets.token_urlsafe(24)
        self.sessions[token] = now + TEACHER_SESSION_SECONDS
        return token

    # --------------------------------------------------------- handlers
    def info(self):
        c = self._class()
        return {"setup": bool(c), "name": c["name"] if c else None, "writable": self.writable}

    def setup(self, body):
        if not self.writable:
            raise ApiError(500, "the server can't save files (check the data folder)")
        name = (body.get("name") or "").strip()[:60] or "My class"
        password = body.get("password") or ""
        if len(password) < 6:
            raise ApiError(400, "the teacher password needs at least 6 characters")
        with self.lock:
            if self._class():
                raise ApiError(409, "a class is already set up on this server")
            salt = secrets.token_hex(16)
            c = {"name": name, "code": _new_code(), "salt": salt, "hash": _hash_password(password, salt), "created": time.time()}
            self._save_json(self.dir / "class.json", c)
        return {"name": name, "code": c["code"], "teacherToken": self._new_session()}

    def join(self, body):
        self._check_code(body.get("code"))
        return {"name": self._class()["name"]}

    def teacher_login(self, body):
        c = self._class()
        if not c:
            raise ApiError(409, "this server has no class set up yet")
        time.sleep(0.4)  # slows down password guessing
        if not hmac.compare_digest(_hash_password(body.get("password") or "", c["salt"]), c["hash"]):
            raise ApiError(403, "wrong teacher password")
        return {"token": self._new_session(), "name": c["name"], "code": c["code"]}

    def teacher_info(self, token):
        self._require_teacher(token)
        c = self._class()
        builds = self._all_builds()
        students = {}
        for b in builds:
            students[b["author"]] = students.get(b["author"], 0) + 1
        return {"name": c["name"], "code": c["code"], "builds": len(builds),
                "hidden": sum(b.get("hidden", False) for b in builds), "students": students}

    def teacher_settings(self, token, body):
        self._require_teacher(token)
        with self.lock:
            c = self._class()
            if body.get("name"):
                c["name"] = body["name"].strip()[:60]
            if body.get("newCode"):
                c["code"] = _new_code()
            if body.get("password"):
                if len(body["password"]) < 6:
                    raise ApiError(400, "the teacher password needs at least 6 characters")
                c["salt"] = secrets.token_hex(16)
                c["hash"] = _hash_password(body["password"], c["salt"])
            self._save_json(self.dir / "class.json", c)
        return {"name": c["name"], "code": c["code"]}

    @staticmethod
    def _summary(b, teacher):
        s = {k: b.get(k) for k in ("id", "author", "studentId", "title", "description", "kind", "created", "claps", "featured", "blockCount")}
        s["preview"] = (b.get("python") or "")[:600]
        if teacher:
            s["hidden"] = b.get("hidden", False)
        return s

    def list_builds(self, code, token):
        self._check_code(code, token)
        teacher = self.is_teacher(token)
        builds = [b for b in self._all_builds() if teacher or not b.get("hidden")]
        builds.sort(key=lambda b: (not b.get("featured"), -b["created"]))
        return {"builds": [self._summary(b, teacher) for b in builds], "teacher": teacher}

    def get_build(self, build_id, code, token):
        self._check_code(code, token)
        b = self._build(build_id)
        if b.get("hidden") and not self.is_teacher(token):
            raise ApiError(404, "build not found")
        b = dict(b)
        b.pop("ownerHash", None)
        b.pop("clappers", None)
        return b

    def share(self, body, code, token, student_token=None):
        self._check_code(code, token)
        me = self.student_for(student_token)
        if not me and not self.is_teacher(token):
            raise ApiError(401, "unlock your account first")
        if not self.writable:
            raise ApiError(500, "the server can't save files (check the data folder)")
        kind = body.get("kind")
        if kind not in ("blocks", "python"):
            raise ApiError(400, "kind must be blocks or python")
        python = _clean(body.get("python"), "python")
        blocks = body.get("blocks")
        if kind == "blocks":
            if not isinstance(blocks, dict):
                raise ApiError(400, "blocks project missing")
            if len(json.dumps(blocks)) > LIMITS["blocks"]:
                raise ApiError(400, "that blocks project is too big to share")
        elif not python:
            raise ApiError(400, "there's no code to share")
        owner = secrets.token_urlsafe(16)
        b = {
            "id": secrets.token_hex(6),
            "author": me["name"] if me else "Teacher",
            "studentId": me["id"] if me else None,
            "title": _clean(body.get("title"), "title", required=True),
            "description": _clean(body.get("description"), "description"),
            "kind": kind, "python": python, "blocks": blocks if kind == "blocks" else None,
            "blockCount": int(body.get("blockCount") or 0) if kind == "blocks" else 0,
            "created": time.time(), "claps": 0, "clappers": [], "featured": False, "hidden": False,
            "ownerHash": hashlib.sha256(owner.encode()).hexdigest(),
        }
        with self.lock:
            self._save_json(self.builds_dir / f"{b['id']}.json", b)
        return {"id": b["id"], "ownerToken": owner}

    def clap(self, build_id, code, token, student_token=None):
        self._check_code(code, token)
        me = self.student_for(student_token)
        who = me["id"] if me else ("teacher" if self.is_teacher(token) else None)
        if not who:
            raise ApiError(401, "unlock your account to clap")
        with self.lock:
            b = self._build(build_id)
            if b.get("hidden"):
                raise ApiError(404, "build not found")
            clappers = b.setdefault("clappers", [])
            if who not in clappers:  # one clap per person
                clappers.append(who)
                b["claps"] = len(clappers)
                self._save_json(self.builds_dir / f"{build_id}.json", b)
        return {"claps": b["claps"], "clapped": True}

    def moderate(self, build_id, token, body):
        self._require_teacher(token)
        with self.lock:
            b = self._build(build_id)
            for k in ("hidden", "featured"):
                if k in body:
                    b[k] = bool(body[k])
            self._save_json(self.builds_dir / f"{build_id}.json", b)
        return self._summary(b, True)

    def delete(self, build_id, token, owner_token, student_token=None):
        with self.lock:
            b = self._build(build_id)
            me = self.student_for(student_token)
            owner_ok = (me and me["id"] == b.get("studentId")) or (
                owner_token and hmac.compare_digest(hashlib.sha256(owner_token.encode()).hexdigest(), b.get("ownerHash", "")))
            if not (owner_ok or self.is_teacher(token)):
                raise ApiError(403, "only the person who shared it (or the teacher) can delete this")
            (self.builds_dir / f"{build_id}.json").unlink(missing_ok=True)
        return {"ok": True}

    # ---------------------------------------------------- kid accounts
    def list_students(self, code, token):
        self._check_code(code, token)
        teacher = self.is_teacher(token)
        builds = self._all_builds() if teacher else []
        out = []
        for sid, st in self._students().items():
            item = {"id": sid, "name": st["name"]}
            if teacher:
                item["builds"] = sum(b.get("studentId") == sid for b in builds)
                item["created"] = st.get("created")
            out.append(item)
        return {"students": sorted(out, key=lambda x: x["name"].lower())}

    def create_student(self, body, code, token):
        # A kid can fill in the form, but a teacher must approve it: either the
        # teacher is logged in, or they type the teacher password into the form.
        if not (self.is_teacher(token) or self._teacher_password_ok(body.get("teacherPassword"))):
            time.sleep(0.4)
            raise ApiError(403, "a teacher needs to type the teacher password to make a new account")
        if not self._class():
            raise ApiError(409, "this server has no class set up yet")
        name = _clean(body.get("name"), "author", required=True)
        pin = str(body.get("pin") or "")
        if not PIN_RE.match(pin):
            raise ApiError(400, "the PIN must be 4 to 6 numbers")
        with self.lock:
            students = self._students()
            if any(st["name"].lower() == name.lower() for st in students.values()):
                raise ApiError(409, f"there's already an account called {name}. Add a letter, like {name} B.")
            sid = secrets.token_hex(6)
            salt = secrets.token_hex(16)
            students[sid] = {"name": name, "salt": salt, "hash": _hash_password(pin, salt), "created": time.time(), "fails": 0, "blockedUntil": 0}
            self._save_json(self.dir / "students.json", students)
        token_ = secrets.token_urlsafe(24)
        self.student_sessions[token_] = (sid, time.time() + STUDENT_SESSION_SECONDS)
        return {"id": sid, "name": name, "studentToken": token_}

    def unlock(self, student_id, body, code):
        self._check_code(code)
        with self.lock:
            students = self._students()
            st = students.get(student_id or "")
            if not st:
                raise ApiError(404, "that account doesn't exist")
            now = time.time()
            if st.get("blockedUntil", 0) > now:
                raise ApiError(429, f"too many wrong PINs. Wait {int(st['blockedUntil'] - now) + 1} seconds and try again")
            if not hmac.compare_digest(_hash_password(str(body.get("pin") or ""), st["salt"]), st["hash"]):
                st["fails"] = st.get("fails", 0) + 1
                if st["fails"] >= PIN_TRIES:
                    st["fails"], st["blockedUntil"] = 0, now + PIN_LOCKOUT_SECONDS
                self._save_json(self.dir / "students.json", students)
                raise ApiError(403, "that PIN isn't right")
            if st.get("fails"):
                st["fails"] = 0
                self._save_json(self.dir / "students.json", students)
        token = secrets.token_urlsafe(24)
        self.student_sessions[token] = (student_id, time.time() + STUDENT_SESSION_SECONDS)
        return {"id": student_id, "name": st["name"], "studentToken": token}

    def lock_account(self, student_token):
        self.student_sessions.pop(student_token or "", None)
        return {"ok": True}

    def me(self, student_token):
        me = self.student_for(student_token)
        if not me:
            raise ApiError(401, "account is locked")
        return me

    def update_student(self, student_id, token, body):
        self._require_teacher(token)
        with self.lock:
            students = self._students()
            st = students.get(student_id or "")
            if not st:
                raise ApiError(404, "that account doesn't exist")
            if body.get("name"):
                name = _clean(body["name"], "author", required=True)
                if any(o["name"].lower() == name.lower() for k, o in students.items() if k != student_id):
                    raise ApiError(409, f"there's already an account called {name}")
                st["name"] = name
            if body.get("pin"):
                if not PIN_RE.match(str(body["pin"])):
                    raise ApiError(400, "the PIN must be 4 to 6 numbers")
                st["salt"] = secrets.token_hex(16)
                st["hash"] = _hash_password(str(body["pin"]), st["salt"])
                st["fails"], st["blockedUntil"] = 0, 0
                for t, (sid, _) in list(self.student_sessions.items()):  # sign them out everywhere
                    if sid == student_id:
                        del self.student_sessions[t]
            self._save_json(self.dir / "students.json", students)
        return {"id": student_id, "name": st["name"]}

    def delete_student(self, student_id, token):
        self._require_teacher(token)
        with self.lock:
            students = self._students()
            if students.pop(student_id or "", None) is None:
                raise ApiError(404, "that account doesn't exist")
            self._save_json(self.dir / "students.json", students)
        for t, (sid, _) in list(self.student_sessions.items()):
            if sid == student_id:
                del self.student_sessions[t]
        return {"ok": True}

    # ----------------------------------------------------------- router
    def route(self, method, path, headers, body):
        code, token, owner = headers.get("X-Class-Code"), headers.get("X-Teacher-Token"), headers.get("X-Owner-Token")
        student = headers.get("X-Student-Token")
        parts = path.rstrip("/").split("/")[3:]  # after /api/class
        if method == "GET" and parts == []:
            return self.info()
        if method == "POST" and parts == ["setup"]:
            return self.setup(body)
        if method == "POST" and parts == ["join"]:
            return self.join(body)
        if method == "POST" and parts == ["teacher", "login"]:
            return self.teacher_login(body)
        if method == "GET" and parts == ["teacher"]:
            return self.teacher_info(token)
        if method == "POST" and parts == ["teacher", "settings"]:
            return self.teacher_settings(token, body)
        if parts[:1] == ["students"]:
            if method == "GET" and len(parts) == 1:
                return self.list_students(code, token)
            if method == "POST" and len(parts) == 1:
                return self.create_student(body, code, token)
            if method == "POST" and len(parts) == 3 and parts[2] == "unlock":
                return self.unlock(parts[1], body, code)
            if method == "PATCH" and len(parts) == 2:
                return self.update_student(parts[1], token, body)
            if method == "DELETE" and len(parts) == 2:
                return self.delete_student(parts[1], token)
        if method == "POST" and parts == ["lock"]:
            return self.lock_account(student)
        if method == "GET" and parts == ["me"]:
            return self.me(student)
        if parts[:1] == ["builds"]:
            if method == "GET" and len(parts) == 1:
                return self.list_builds(code, token)
            if method == "POST" and len(parts) == 1:
                return self.share(body, code, token, student)
            if len(parts) == 2:
                if method == "GET":
                    return self.get_build(parts[1], code, token)
                if method == "PATCH":
                    return self.moderate(parts[1], token, body)
                if method == "DELETE":
                    return self.delete(parts[1], token, owner, student)
            if len(parts) == 3 and parts[2] == "clap" and method == "POST":
                return self.clap(parts[1], code, token, student)
        raise ApiError(404, "not found")
