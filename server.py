#!/usr/bin/env python3
"""Local web server for the micro:bit manager.

Serves the web UI on http://localhost:8321 (localhost counts as a secure
context, so Chrome allows Web Serial and WebUSB there) and adds a small API
that can flash a .hex by copying it onto the mounted MICROBIT USB drive.
That fallback works with any micro:bit v1 firmware, even old DAPLink
versions that don't support WebUSB flashing.

Standard library only. Binds to 127.0.0.1 by default, so it is not reachable
from other machines. In a container it binds 0.0.0.0 and compose publishes
the port on the host's 127.0.0.1 only (see compose.yaml).

Settings can also come from the environment (handy in containers):
  MICROBIT_HOST, MICROBIT_PORT, MICROBIT_NO_BROWSER=1,
  MICROBIT_MEDIA_ROOTS=/media:/run/media:/mnt  (where to look for the drive)
  MICROBIT_DATA=./data            (where the class Explorer saves shared builds)
  MICROBIT_DRIVE_API=0            (turn off USB-drive flashing, for a class server
                                   that other computers can reach)
"""
import argparse
import json
import os
import signal
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from classroom import LOCAL_ORIGIN, MAX_BODY, ApiError, Classroom

HERE = Path(__file__).resolve().parent
STATIC = HERE / "static"
MAX_HEX = 4 * 1024 * 1024  # a v1 hex is ~1.5 MB at most
MEDIA_ROOTS = [Path(p) for p in os.environ.get("MICROBIT_MEDIA_ROOTS", "/media:/run/media:/mnt").split(":") if p]
DRIVE_API = os.environ.get("MICROBIT_DRIVE_API", "1") != "0"
CLASS = Classroom(os.environ.get("MICROBIT_DATA") or HERE / "data")


def _candidate_dirs():
    """Folders that might be the MICROBIT drive: <root>/X and <root>/<user>/X.

    Desktop Linux mounts USB drives at /media/<user>/MICROBIT or
    /run/media/<user>/MICROBIT. Scanning one level of user folders means it is
    found without knowing the user name (inside a container there may be none).
    """
    for root in MEDIA_ROOTS:
        try:
            level1 = [p for p in root.iterdir() if p.is_dir()]
        except OSError:
            continue
        for p in level1:
            yield p
            try:
                yield from (q for q in p.iterdir() if q.is_dir())
            except OSError:
                pass


def find_drives():
    """Return mounted micro:bit drives (folders containing DETAILS.TXT)."""
    seen, drives = set(), []
    for p in _candidate_dirs():
        try:
            if p in seen or not (p / "DETAILS.TXT").is_file():
                continue
        except OSError:
            continue
        seen.add(p)
        details = {}
        try:
            for line in (p / "DETAILS.TXT").read_text(errors="replace").splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    details[k.strip()] = v.strip()
        except OSError:
            pass
        try:
            fail = (p / "FAIL.TXT").read_text(errors="replace").strip() if (p / "FAIL.TXT").is_file() else None
        except OSError:
            fail = None
        drives.append({"path": str(p), "name": p.name, "details": details, "fail": fail})
    return drives


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(STATIC), **kw)

    def log_message(self, fmt, *args):
        if len(args) > 1 and "GET /api/drive " in str(args[0]) and str(args[1]) == "200":
            return  # the UI polls this; keep the log quiet
        super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        cors = getattr(self, "_cors_origin", None)
        if cors:
            # Students' own local copies of the app (http://localhost:…) call the class server.
            self.send_header("Access-Control-Allow-Origin", cors)
            self.send_header("Vary", "Origin")
        super().end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _same_origin(self):
        # Refuse cross-site POSTs so other websites can't flash your board.
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")
        return origin is None or origin in (f"http://{host}",)

    # ------------------------------------------------ class Explorer API
    def _class_api(self, method):
        origin = self.headers.get("Origin")
        cross = origin and not self._same_origin()
        if cross and not LOCAL_ORIGIN.match(origin):
            return self._json(403, {"error": "cross-origin request refused"})
        self._cors_origin = origin if cross else None
        if method == "OPTIONS":  # CORS preflight
            self.send_response(204)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Class-Code, X-Teacher-Token, X-Owner-Token, X-Student-Token")
            self.send_header("Access-Control-Max-Age", "600")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        body = {}
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self._json(413, {"error": "that's too big to share"})
        if length:
            try:
                body = json.loads(self.rfile.read(length))
            except ValueError:
                return self._json(400, {"error": "bad request"})
        try:
            return self._json(200, CLASS.route(method, self.path.split("?")[0], self.headers, body if isinstance(body, dict) else {}))
        except ApiError as e:
            return self._json(e.status, {"error": e.message})

    def do_OPTIONS(self):
        if self.path.startswith("/api/class"):
            return self._class_api("OPTIONS")
        return self._json(404, {"error": "not found"})

    def do_PATCH(self):
        if self.path.startswith("/api/class"):
            return self._class_api("PATCH")
        return self._json(404, {"error": "not found"})

    def do_DELETE(self):
        if self.path.startswith("/api/class"):
            return self._class_api("DELETE")
        return self._json(404, {"error": "not found"})

    def do_GET(self):
        if self.path.startswith("/api/class"):
            return self._class_api("GET")
        if self.path == "/api/drive":
            return self._json(200, {"drives": find_drives() if DRIVE_API else [], "disabled": not DRIVE_API})
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/class"):
            return self._class_api("POST")
        if self.path != "/api/drive/flash":
            return self._json(404, {"error": "not found"})
        if not DRIVE_API:
            return self._json(403, {"error": "USB-drive flashing is turned off on this server"})
        if not self._same_origin():
            return self._json(403, {"error": "cross-origin request refused"})
        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= MAX_HEX:
            return self._json(400, {"error": "hex file missing or too large"})
        data = self.rfile.read(length)
        if not data.lstrip().startswith(b":"):
            return self._json(400, {"error": "that doesn't look like an Intel .hex file"})
        drives = find_drives()
        want = self.headers.get("X-Drive")
        drive = next((d for d in drives if d["path"] == want), drives[0] if drives else None)
        if not drive:
            return self._json(409, {"error": "no MICROBIT drive is mounted"})
        target = Path(drive["path"]) / "firmware.hex"
        try:
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
            try:
                os.write(fd, data)
                os.fsync(fd)  # make sure DAPLink sees the whole file
            finally:
                os.close(fd)
        except OSError as e:
            # DAPLink unmounts itself mid-copy once programming starts; that's normal.
            if e.errno not in (5, 19):  # EIO, ENODEV
                return self._json(500, {"error": f"copy failed: {e}"})
        return self._json(200, {"ok": True, "drive": drive["path"], "bytes": len(data)})


def main():
    env = os.environ.get
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--host", default=env("MICROBIT_HOST", "127.0.0.1"),
                    help="address to listen on (default 127.0.0.1; use 0.0.0.0 inside a container)")
    ap.add_argument("--port", type=int, default=int(env("MICROBIT_PORT", "8321")))
    ap.add_argument("--no-browser", action="store_true", default=env("MICROBIT_NO_BROWSER") == "1",
                    help="don't open a browser tab")
    args = ap.parse_args()
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    # `docker stop` sends SIGTERM: stop the same way Ctrl+C does, instead of waiting to be killed
    def stop(*_):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    url = f"http://localhost:{args.port}/"
    print(f"micro:bit manager running at {url}  (listening on {args.host}; Ctrl+C to stop)", flush=True)
    print("Use Chrome, Chromium or Edge: Firefox and Safari lack Web Serial/WebUSB.", flush=True)
    print("Looking for the MICROBIT drive in: " + ", ".join(map(str, MEDIA_ROOTS)) if DRIVE_API
          else "USB-drive flashing is turned off (MICROBIT_DRIVE_API=0)", flush=True)
    print(f"Class Explorer data: {CLASS.dir}" + ("" if CLASS.writable else "  (NOT writable: sharing won't work)"), flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped", flush=True)
    finally:
        srv.server_close()


if __name__ == "__main__":
    main()
