#!/usr/bin/env python3
"""Local web server for the micro:bit manager.

Serves the web UI on http://localhost:8321 (localhost counts as a secure
context, so Chrome allows Web Serial and WebUSB there) and adds a small API
that can flash a .hex by copying it onto the mounted MICROBIT USB drive.
That fallback works with any micro:bit v1 firmware, even old DAPLink
versions that don't support WebUSB flashing.

Standard library only. Binds to 127.0.0.1, so it is not reachable from
other machines.
"""
import argparse
import getpass
import json
import os
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
STATIC = HERE / "static"
MAX_HEX = 4 * 1024 * 1024  # a v1 hex is ~1.5 MB at most


def find_drives():
    """Return mounted micro:bit drives (folders containing DETAILS.TXT + MICROBIT.HTM)."""
    user = getpass.getuser()
    roots = [Path("/media") / user, Path("/run/media") / user, Path("/media"), Path("/mnt")]
    seen, drives = set(), []
    for root in roots:
        try:
            candidates = [p for p in root.iterdir() if p.is_dir()]
        except OSError:
            continue
        for p in candidates:
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
            drives.append({"path": str(p), "name": p.name, "details": details,
                           "fail": (p / "FAIL.TXT").read_text(errors="replace").strip()
                           if (p / "FAIL.TXT").is_file() else None})
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

    def do_GET(self):
        if self.path == "/api/drive":
            return self._json(200, {"drives": find_drives()})
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/drive/flash":
            return self._json(404, {"error": "not found"})
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
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=8321)
    ap.add_argument("--no-browser", action="store_true", help="don't open a browser tab")
    args = ap.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    url = f"http://localhost:{args.port}/"
    print(f"micro:bit manager running at {url}  (Ctrl+C to stop)")
    print("Use Chrome, Chromium or Edge: Firefox and Safari lack Web Serial/WebUSB.")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


if __name__ == "__main__":
    main()
