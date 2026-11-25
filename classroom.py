"""Class Explorer back end: a shared gallery of students' micro:bit builds.

One computer on the school network runs this (the "class server"). Students
join with a class code, share builds and browse their classmates' builds; the
teacher logs in with a password to see everything and moderate.

Storage is plain JSON files in a data folder:
    <data>/class.json            class name, join code, teacher password hash
    <data>/students.json         kid accounts: name + hashed PIN
    <data>/builds/<id>.json      one file per shared build
    <data>/quizzes/<id>.json     quizzes the teacher wrote, with kids' results

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
# Live class games played with a teacher quiz
GAME_MODES = {"mining", "race"}
ORES = [  # name, emoji, value, chance weight
    ("Stone", "🪨", 1, 40), ("Coal", "🌑", 3, 25), ("Iron", "🔩", 6, 17),
    ("Gold", "🪙", 12, 10), ("Diamond", "💎", 25, 6), ("Emerald", "💚", 50, 2),
]
KICKED_MESSAGE = "your teacher removed you from this game"
MIN_ANSWER_SECONDS = 0.6  # stops answer-spamming
# A kid's Bit (helper robot) saved on their account
BIT_SLOTS = {"head", "face", "neck", "hand", "ride", "feet", "back", "aura"}
BIT_LOOK_KEYS = {"body", "glow", "eyes", "mouth", "antenna"}
ITEM_ID = re.compile(r"^[a-z0-9_]{1,30}$")
LOOK_ID = re.compile(r"^(body|glow|eyes|mouth|antenna):[A-Za-z]{1,20}$")
MAX_BUCKS = 1_000_000
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
        self.quizzes_dir = self.dir / "quizzes"
        self.lock = threading.Lock()
        self.sessions = {}          # teacher token -> expiry time
        self.student_sessions = {}  # student token -> (student id, expiry time)
        self.login_fails = []       # times of recent wrong teacher passwords (slows down guessing)
        self.games = {}             # live games, in memory: game id -> game
        try:
            self.builds_dir.mkdir(parents=True, exist_ok=True)
            self.quizzes_dir.mkdir(parents=True, exist_ok=True)
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
        now = time.time()
        self.login_fails = [t for t in self.login_fails if now - t < 600]
        if not (c and password) or len(self.login_fails) >= 10:
            return False
        ok = hmac.compare_digest(_hash_password(password, c["salt"]), c["hash"])
        if not ok:
            self.login_fails.append(now)
        return ok

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
        now = time.time()
        self.login_fails = [t for t in self.login_fails if now - t < 600]
        if len(self.login_fails) >= 10:  # 10 wrong passwords in 10 minutes: pause teacher logins
            raise ApiError(429, "too many wrong teacher passwords. Wait a few minutes and try again")
        time.sleep(0.4)  # slows down password guessing
        if not hmac.compare_digest(_hash_password(body.get("password") or "", c["salt"]), c["hash"]):
            self.login_fails.append(time.time())
            raise ApiError(403, "wrong teacher password")
        return {"token": self._new_session(), "name": c["name"], "code": c["code"]}

    def teacher_info(self, token):
        self._require_teacher(token)
        c = self._class()
        builds = self._all_builds()
        students = {}
        for b in builds:
            students[b["author"]] = students.get(b["author"], 0) + 1
        return {"name": c["name"], "code": c["code"], "builds": len(builds), "accounts": len(self._students()),
                "hidden": sum(b.get("hidden", False) for b in builds), "students": students}

    def reset_teacher_password(self, password):
        """Set a new teacher password directly (used by the server's --reset-teacher-password
        command, which only someone with access to the server computer can run)."""
        if len(password) < 6:
            raise ApiError(400, "the teacher password needs at least 6 characters")
        with self.lock:
            c = self._class()
            if not c:
                raise ApiError(409, "no class is set up yet: create one from the Explorer tab instead")
            c["salt"] = secrets.token_hex(16)
            c["hash"] = _hash_password(password, c["salt"])
            self._save_json(self.dir / "class.json", c)
        return c["name"]

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
                prof = st.get("profile") or {}
                item["bucks"] = prof.get("bucks")
                item["outfits"] = len(prof.get("owned") or [])
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

    def teacher_session_for(self, student_id, token):
        """Teacher unlocks a kid's locked screen: a fresh session for that kid."""
        self._require_teacher(token)
        st = self._student(student_id)
        t = secrets.token_urlsafe(24)
        self.student_sessions[t] = (student_id, time.time() + STUDENT_SESSION_SECONDS)
        return {"id": student_id, "name": st["name"], "studentToken": t}

    def lock_account(self, student_token):
        self.student_sessions.pop(student_token or "", None)
        return {"ok": True}

    def me(self, student_token):
        me = self.student_for(student_token)
        if not me:
            raise ApiError(401, "account is locked")
        return me

    @staticmethod
    def _clean_profile(p):
        if not isinstance(p, dict):
            raise ApiError(400, "bad Bit profile")
        owned = []
        for x in p.get("owned") or []:
            if isinstance(x, str) and ITEM_ID.match(x) and x not in owned:
                owned.append(x)
        equipped = {k: v for k, v in (p.get("equipped") or {}).items()
                    if k in BIT_SLOTS and isinstance(v, str) and v in owned}
        look = {k: str(v)[:20] for k, v in (p.get("look") or {}).items() if k in BIT_LOOK_KEYS}
        owned_looks = []
        for x in p.get("ownedLooks") or []:
            if isinstance(x, str) and LOOK_ID.match(x) and x not in owned_looks:
                owned_looks.append(x)
        bucks = p.get("bucks")
        bucks = max(0, min(MAX_BUCKS, int(bucks))) if isinstance(bucks, (int, float)) else 100
        return {"name": (str(p.get("name") or "Bit").strip() or "Bit")[:20], "owned": owned[:200],
                "equipped": equipped, "look": look, "ownedLooks": owned_looks[:100], "bucks": bucks,
                "games": Classroom._clean_games(p.get("games")), "saved": time.time()}

    @staticmethod
    def _clean_games(g):
        """Arcade games a kid owns, their battery charges and best scores, and the Blocky World chips found."""
        g = g if isinstance(g, dict) else {}
        owned = [x for x in (g.get("owned") or []) if isinstance(x, str) and ITEM_ID.match(x)][:20]
        num = lambda d, lo, hi, cast: {k: max(lo, min(hi, cast(v))) for k, v in (d or {}).items()
                                       if k in owned and isinstance(v, (int, float))}
        return {"owned": owned, "charges": num(g.get("charges"), 0, 3, int),
                "updated": num(g.get("updated"), 0, 1e14, float), "best": num(g.get("best"), 0, 10**7, int),
                "world": list(dict.fromkeys(x for x in (g.get("world") or []) if isinstance(x, str) and ITEM_ID.match(x)))[:60]}

    def get_profile(self, student_token):
        me = self.me(student_token)
        return {"profile": self._students().get(me["id"], {}).get("profile")}

    def save_profile(self, student_token, body):
        me = self.me(student_token)
        prof = self._clean_profile(body.get("profile"))
        with self.lock:
            students = self._students()
            if me["id"] not in students:
                raise ApiError(404, "that account doesn't exist")
            students[me["id"]]["profile"] = prof
            self._save_json(self.dir / "students.json", students)
        return {"ok": True, "saved": prof["saved"]}

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

    # ------------------------------------------------- teacher quizzes
    def _quiz(self, quiz_id):
        if not re.fullmatch(r"[0-9a-f]{12}", quiz_id or ""):
            raise ApiError(404, "quiz not found")
        try:
            return json.loads((self.quizzes_dir / f"{quiz_id}.json").read_text())
        except (OSError, ValueError):
            raise ApiError(404, "quiz not found")

    def _all_quizzes(self):
        out = []
        for p in self.quizzes_dir.glob("*.json"):
            try:
                out.append(json.loads(p.read_text()))
            except (OSError, ValueError):
                pass
        return sorted(out, key=lambda q: q["created"], reverse=True)

    def _quiz_by_code(self, code):
        code = (code or "").strip().upper()
        for q in self._all_quizzes():
            if code and hmac.compare_digest(q["code"], code):
                return q
        raise ApiError(404, "there's no quiz with that code. Check it with your teacher")

    @staticmethod
    def _clean_questions(questions):
        if not isinstance(questions, list) or not 1 <= len(questions) <= 30:
            raise ApiError(400, "a quiz needs 1 to 30 questions")
        out = []
        for n, q in enumerate(questions, 1):
            if not isinstance(q, dict):
                raise ApiError(400, f"question {n} is broken")
            text = (q.get("q") or "").strip()
            answers = [str(a).strip() for a in (q.get("answers") or []) if str(a).strip()]
            correct = q.get("correct")
            why = (q.get("why") or "").strip()
            if not text or len(text) > 200:
                raise ApiError(400, f"question {n} needs some text (up to 200 characters)")
            if not 2 <= len(answers) <= 4 or any(len(a) > 100 for a in answers):
                raise ApiError(400, f"question {n} needs 2 to 4 answers (up to 100 characters each)")
            if not isinstance(correct, int) or not 0 <= correct < len(answers):
                raise ApiError(400, f"question {n}: pick which answer is right")
            if len(why) > 300:
                raise ApiError(400, f"question {n}: the explanation is too long")
            out.append({"q": text, "answers": answers, "correct": correct, "why": why})
        return out

    def _new_quiz_code(self):
        taken = {q["code"] for q in self._all_quizzes()} | {(self._class() or {}).get("code")}
        while True:
            code = _new_code()
            if code not in taken:
                return code

    def create_quiz(self, token, body):
        self._require_teacher(token)
        title = (body.get("title") or "").strip()
        if not title or len(title) > 80:
            raise ApiError(400, "give the quiz a name (up to 80 characters)")
        questions = self._clean_questions(body.get("questions"))
        with self.lock:
            q = {"id": secrets.token_hex(6), "code": self._new_quiz_code(), "title": title, "questions": questions,
                 "created": time.time(), "open": True, "results": []}
            self._save_json(self.quizzes_dir / f"{q['id']}.json", q)
        return {"id": q["id"], "code": q["code"]}

    def list_quizzes(self, token):
        self._require_teacher(token)
        return {"quizzes": [{"id": q["id"], "code": q["code"], "title": q["title"], "questions": len(q["questions"]),
                             "open": q["open"], "created": q["created"], "results": len(q["results"]),
                             "kids": len({r["studentId"] for r in q["results"]}),
                             "liveGame": (lambda g: {"id": g["id"], "mode": g["mode"]} if g else None)(self._live_game_for(q["id"])),
                             "lastGame": (q.get("games") or [None])[-1]} for q in self._all_quizzes()]}

    def get_quiz_admin(self, quiz_id, token):
        self._require_teacher(token)
        return self._quiz(quiz_id)

    def update_quiz(self, quiz_id, token, body):
        self._require_teacher(token)
        with self.lock:
            q = self._quiz(quiz_id)
            if "title" in body:
                title = (body.get("title") or "").strip()
                if not title or len(title) > 80:
                    raise ApiError(400, "give the quiz a name (up to 80 characters)")
                q["title"] = title
            if "questions" in body:
                q["questions"] = self._clean_questions(body["questions"])
            if "open" in body:
                q["open"] = bool(body["open"])
            if body.get("clearResults"):
                q["results"] = []
            self._save_json(self.quizzes_dir / f"{quiz_id}.json", q)
        return {"id": q["id"], "code": q["code"], "open": q["open"]}

    def delete_quiz(self, quiz_id, token):
        self._require_teacher(token)
        with self.lock:
            self._quiz(quiz_id)
            (self.quizzes_dir / f"{quiz_id}.json").unlink(missing_ok=True)
        return {"ok": True}

    def _playable(self, quiz_code, code, token, student_token):
        self._check_code(code, token)
        me = self.student_for(student_token)
        if not me and not self.is_teacher(token):
            raise ApiError(401, "unlock your account first, so your score is saved")
        q = self._quiz_by_code(quiz_code)
        if not q["open"] and not self.is_teacher(token):
            raise ApiError(403, "this quiz is closed right now")
        return q, me

    def play_quiz(self, quiz_code, code, token, student_token):
        q, _ = self._playable(quiz_code, code, token, student_token)
        # never send the right answers to the kid's computer up front
        live = self._live_game_for(q["id"])
        return {"code": q["code"], "title": q["title"], "questions": [{"q": x["q"], "answers": x["answers"]} for x in q["questions"]],
                "game": {"id": live["id"], "mode": live["mode"]} if live else None, "ores": self.ore_table()}

    def check_answer(self, quiz_code, body, code, token, student_token):
        q, _ = self._playable(quiz_code, code, token, student_token)
        i = body.get("i")
        if not isinstance(i, int) or not 0 <= i < len(q["questions"]):
            raise ApiError(400, "no such question")
        item = q["questions"][i]
        return {"correct": body.get("choice") == item["correct"], "correctIndex": item["correct"],
                "correctText": item["answers"][item["correct"]], "why": item["why"]}

    def submit_quiz(self, quiz_code, body, code, token, student_token):
        q, me = self._playable(quiz_code, code, token, student_token)
        answers = body.get("answers")
        if not isinstance(answers, list) or len(answers) != len(q["questions"]):
            raise ApiError(400, "answer every question first")
        score = sum(1 for a, item in zip(answers, q["questions"]) if a == item["correct"])
        total = len(q["questions"])
        if me:  # the teacher trying it out isn't recorded
            with self.lock:
                q = self._quiz(q["id"])
                q["results"].append({"studentId": me["id"], "name": me["name"], "score": score, "total": total,
                                     "answers": answers, "at": time.time()})
                self._save_json(self.quizzes_dir / f"{q['id']}.json", q)
        return {"score": score, "total": total}


    # ----------------------------------------------------- live games
    def _game(self, game_id):
        g = self.games.get(game_id or "")
        if not g:
            raise ApiError(404, "that game isn't running any more")
        if not g["ended"] and time.time() >= g["endsAt"]:
            self._finish(g)
        return g

    def _live_game_for(self, quiz_id):
        for g in list(self.games.values()):
            if g["quizId"] == quiz_id:
                if not g["ended"] and time.time() >= g["endsAt"]:
                    self._finish(g)
                if not g["ended"]:
                    return g
        return None

    @staticmethod
    def _standings(g):
        players = sorted(g["players"].values(), key=lambda p: (-p["score"], p["reachedAt"]))
        out, place = [], 0
        for i, p in enumerate(players):
            if i == 0 or p["score"] != players[i - 1]["score"]:
                place = i + 1  # equal scores share a place
            out.append({"place": place, "id": p["id"], "name": p["name"], "score": p["score"],
                        "correct": p["correct"], "answered": p["answered"], "ores": p["ores"]})
        return out

    def _finish(self, g):
        if g["ended"]:
            return
        g["ended"] = True
        g["endedAt"] = min(time.time(), g["endsAt"])
        try:  # keep a record with the quiz for the teacher
            with self.lock:
                q = self._quiz(g["quizId"])
                q.setdefault("games", []).append({"mode": g["mode"], "started": g["started"], "minutes": g["minutes"],
                                                  "standings": [{k: p[k] for k in ("place", "name", "score", "correct")} for p in self._standings(g)]})
                q["games"] = q["games"][-20:]
                self._save_json(self.quizzes_dir / f"{g['quizId']}.json", q)
        except ApiError:
            pass

    def _public_game(self, g, me_id=None, full=False):
        st = self._standings(g)
        now = time.time()
        out = {"id": g["id"], "mode": g["mode"], "title": g["title"], "minutes": g["minutes"], "ended": g["ended"],
               "secondsLeft": 0 if g["ended"] else max(0, round(g["endsAt"] - now, 1)),
               "players": len(st), "top": st if full else st[:10], "ores": self.ore_table()}
        if full:
            out["kicked"] = [{"id": p["id"], "name": p["name"]} for p in g.get("kicked", {}).values()]
        if me_id:
            mine = next((p for p in st if p["id"] == me_id), None)
            out["me"] = mine
        return out

    def start_game(self, quiz_id, token, body):
        self._require_teacher(token)
        mode = body.get("mode")
        if mode not in GAME_MODES:
            raise ApiError(400, "pick a game mode")
        try:
            minutes = float(body.get("minutes") or 5)
        except (TypeError, ValueError):
            raise ApiError(400, "set how many minutes the game lasts")
        if not 0.5 <= minutes <= 60:
            raise ApiError(400, "a game can last from half a minute to 60 minutes")
        q = self._quiz(quiz_id)
        old = self._live_game_for(quiz_id)
        if old:
            self._finish(old)
        now = time.time()
        g = {"id": secrets.token_hex(6), "quizId": quiz_id, "title": q["title"], "mode": mode, "minutes": minutes,
             "started": now, "endsAt": now + minutes * 60, "ended": False, "players": {}, "kicked": {}}
        self.games[g["id"]] = g
        for gid, old_g in list(self.games.items()):  # forget games that ended over a day ago
            if old_g["ended"] and now - old_g.get("endedAt", now) > 86400:
                del self.games[gid]
        return self._public_game(g, full=True)

    def game_status_teacher(self, game_id, token):
        self._require_teacher(token)
        return self._public_game(self._game(game_id), full=True)

    def end_game(self, game_id, token):
        self._require_teacher(token)
        g = self._game(game_id)
        g["endsAt"] = min(g["endsAt"], time.time())
        self._finish(g)
        return self._public_game(g, full=True)

    def kick_player(self, game_id, token, body):
        """The teacher removes a kid from a live game. Their score is kept aside (not shown),
        so "let back in" can restore it if the teacher clicked the wrong name."""
        self._require_teacher(token)
        g = self._game(game_id)
        pid = body.get("id")
        if not isinstance(pid, str):
            raise ApiError(400, "pick a player")
        with self.lock:
            p = g["players"].pop(pid, None)
            if p is None:
                if pid in g.setdefault("kicked", {}):
                    return self._public_game(g, full=True)
                raise ApiError(404, "that player isn't in this game")
            g.setdefault("kicked", {})[pid] = p
        return self._public_game(g, full=True)

    def unkick_player(self, game_id, token, body):
        self._require_teacher(token)
        g = self._game(game_id)
        with self.lock:
            p = g.setdefault("kicked", {}).pop(body.get("id") if isinstance(body.get("id"), str) else "", None)
            if p is None:
                raise ApiError(404, "that player wasn't removed")
            g["players"][p["id"]] = p
        return self._public_game(g, full=True)

    def _player(self, g, me, q):
        p = g["players"].get(me["id"])
        if not p:
            order = list(range(len(q["questions"])))
            secrets.SystemRandom().shuffle(order)
            p = {"id": me["id"], "name": me["name"], "score": 0, "correct": 0, "answered": 0, "ores": {},
                 "order": order, "pos": 0, "askedAt": time.time(), "reachedAt": time.time()}
            g["players"][me["id"]] = p
        return p

    def _next_question(self, p, q):
        if p["pos"] >= len(p["order"]):  # went through them all: shuffle and go round again
            secrets.SystemRandom().shuffle(p["order"])
            p["pos"] = 0
        qi = p["order"][p["pos"]]
        item = q["questions"][qi]
        return {"i": qi, "q": item["q"], "answers": item["answers"]}

    def _playing(self, game_id, code, student_token):
        self._check_code(code)
        me = self.student_for(student_token)
        if not me:
            raise ApiError(401, "unlock your account first, so you can play")
        g = self._game(game_id)
        if me["id"] in g.get("kicked", {}):
            raise ApiError(403, KICKED_MESSAGE)
        return g, me, self._quiz(g["quizId"])

    def join_game(self, game_id, code, student_token):
        g, me, q = self._playing(game_id, code, student_token)
        out = self._public_game(g, me["id"])
        if not g["ended"]:
            p = self._player(g, me, q)
            p["askedAt"] = time.time()
            out["question"] = self._next_question(p, q)
            out["me"] = next(x for x in self._standings(g) if x["id"] == me["id"])
        return out

    def game_status(self, game_id, code, student_token):
        g, me, _ = self._playing(game_id, code, student_token)
        return self._public_game(g, me["id"])

    def game_answer(self, game_id, body, code, student_token):
        g, me, q = self._playing(game_id, code, student_token)
        if g["ended"]:
            raise ApiError(409, "time's up! The game has ended")
        p = self._player(g, me, q)
        now = time.time()
        expected = self._next_question(p, q)
        if body.get("i") != expected["i"]:
            raise ApiError(409, "that question was already answered")
        if now - p["askedAt"] < MIN_ANSWER_SECONDS:
            raise ApiError(429, "slow down and read the question!")
        item = q["questions"][expected["i"]]
        correct = body.get("choice") == item["correct"]
        reward = None
        with self.lock:
            p["answered"] += 1
            if correct:
                p["correct"] += 1
                if g["mode"] == "mining":
                    name, emoji, value, _ = secrets.SystemRandom().choices(ORES, weights=[o[3] for o in ORES])[0]
                    p["ores"][name] = p["ores"].get(name, 0) + 1
                    reward = {"ore": name, "emoji": emoji, "value": value}
                else:  # race: 100 points, plus up to 100 more for answering within 10 seconds
                    bonus = max(0, round(100 - (now - p["askedAt"]) * 10))
                    value = 100 + bonus
                    reward = {"points": value, "bonus": bonus}
                p["score"] += value
                p["reachedAt"] = now
            p["pos"] += 1
            p["askedAt"] = now
        out = self._public_game(g, me["id"])
        out.update({"correct": correct, "correctIndex": item["correct"], "correctText": item["answers"][item["correct"]],
                    "why": item["why"], "reward": reward, "question": self._next_question(p, q)})
        return out

    @staticmethod
    def ore_table():
        total = sum(o[3] for o in ORES)
        return [{"name": n, "emoji": e, "value": v, "chance": round(w * 100 / total)} for n, e, v, w in ORES]

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
            if method == "POST" and len(parts) == 3 and parts[2] == "session":
                return self.teacher_session_for(parts[1], token)
            if method == "PATCH" and len(parts) == 2:
                return self.update_student(parts[1], token, body)
            if method == "DELETE" and len(parts) == 2:
                return self.delete_student(parts[1], token)
        if method == "POST" and parts == ["lock"]:
            return self.lock_account(student)
        if method == "GET" and parts == ["me"]:
            return self.me(student)
        if parts == ["me", "profile"]:
            if method == "GET":
                return self.get_profile(student)
            if method == "POST":
                return self.save_profile(student, body)
        if parts[:1] == ["quizzes"]:
            if method == "GET" and len(parts) == 1:
                return self.list_quizzes(token)
            if method == "POST" and len(parts) == 1:
                return self.create_quiz(token, body)
            if len(parts) == 2:
                if method == "GET":
                    return self.get_quiz_admin(parts[1], token)
                if method == "PATCH":
                    return self.update_quiz(parts[1], token, body)
                if method == "DELETE":
                    return self.delete_quiz(parts[1], token)
        if parts[:1] == ["quizzes"] and len(parts) == 3 and parts[2] == "game" and method == "POST":
            return self.start_game(parts[1], token, body)
        if parts[:1] == ["games"] and len(parts) >= 2:
            if method == "GET" and len(parts) == 2:
                return self.game_status_teacher(parts[1], token)
            if method == "POST" and len(parts) == 3 and parts[2] == "end":
                return self.end_game(parts[1], token)
            if method == "POST" and len(parts) == 3 and parts[2] == "kick":
                return self.kick_player(parts[1], token, body)
            if method == "POST" and len(parts) == 3 and parts[2] == "unkick":
                return self.unkick_player(parts[1], token, body)
        if parts[:1] == ["play"] and len(parts) >= 2:
            if method == "GET" and len(parts) == 2:
                return self.game_status(parts[1], code, student)
            if method == "POST" and len(parts) == 3 and parts[2] == "join":
                return self.join_game(parts[1], code, student)
            if method == "POST" and len(parts) == 3 and parts[2] == "answer":
                return self.game_answer(parts[1], body, code, student)
        if parts[:1] == ["quiz"] and len(parts) >= 2:
            if method == "GET" and len(parts) == 2:
                return self.play_quiz(parts[1], code, token, student)
            if method == "POST" and len(parts) == 3 and parts[2] == "check":
                return self.check_answer(parts[1], body, code, token, student)
            if method == "POST" and len(parts) == 3 and parts[2] == "submit":
                return self.submit_quiz(parts[1], body, code, token, student)
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
