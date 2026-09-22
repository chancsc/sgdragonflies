#!/usr/bin/env python3
"""Local admin server for editing species content (data/species.json) and
photos (images/). Zero external dependencies - Python 3 stdlib only.

Usage:
    python3 admin/server.py [port] [--tunnel]
    python3 admin/server.py stop
    python3 admin/server.py restart [port] [--tunnel]

Then open http://127.0.0.1:8800 in a browser. Binds to 127.0.0.1 only -
not reachable from other machines on the network.

Pass --tunnel to also open a temporary Cloudflare quick tunnel, giving you
a random *.trycloudflare.com URL that forwards to the local server for
external access. Requires the `cloudflared` binary. The tunnel (and the
URL) go away when the server is stopped - anyone with the URL in the
meantime has full admin access (no login), so only share it with people
you trust and only while you're actively using it.

`stop` terminates the instance tracked in admin/server.pid (and its
tunnel, if any). `restart` does that, then starts a fresh instance in
the background, logging to admin/server.log - useful after pulling
changes to server.py/app.js, or to recover one left running in the
background.
"""
import base64
import json
import mimetypes
import os
import re
import signal
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
ADMIN_DIR = ROOT / "admin"
IMAGES_DIR = ROOT / "images"
SPECIES_JSON = ROOT / "data" / "species.json"
SERVER_LOG = ADMIN_DIR / "server.log"
PID_FILE = ADMIN_DIR / "server.pid"

_argv = sys.argv[1:]
COMMAND = _argv[0] if _argv and _argv[0] in ("stop", "restart") else None
_rest = _argv[1:] if COMMAND else _argv

TUNNEL = "--tunnel" in _rest
_port_args = [a for a in _rest if a != "--tunnel"]
PORT = int(_port_args[0]) if _port_args else 8800

SAFE_FILENAME = re.compile(r"^[A-Za-z0-9._\-&@]+\.(jpg|jpeg|png|gif|svg|webp)$", re.I)


def load_species():
    return json.loads(SPECIES_JSON.read_text(encoding="utf-8"))


def save_species(species):
    SPECIES_JSON.write_text(
        json.dumps(species, ensure_ascii=False, indent=2), encoding="utf-8"
    )


class Handler(BaseHTTPRequestHandler):
    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _send_file(self, path, content_type=None):
        if not path.is_file():
            self._send_json({"error": "not found"}, 404)
            return
        data = path.read_bytes()
        try:
            self.send_response(200)
            self.send_header(
                "Content-Type", content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
            )
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    # ---- routing ----

    def do_GET(self):
        path = unquote(self.path.split("?", 1)[0])

        if path == "/" or path == "/index.html":
            self._send_file(ADMIN_DIR / "index.html", "text/html; charset=utf-8")
        elif path == "/app.js":
            self._send_file(ADMIN_DIR / "app.js", "application/javascript; charset=utf-8")
        elif path == "/api/species":
            self._send_json(load_species())
        elif path.startswith("/images/"):
            name = path[len("/images/"):]
            self._send_file(IMAGES_DIR / name)
        else:
            self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        path = unquote(self.path.split("?", 1)[0])

        if path == "/api/species":
            record = self._read_json_body()
            species = load_species()
            next_id = (max((s.get("id", 0) for s in species), default=0)) + 1
            record["id"] = next_id
            species.append(record)
            save_species(species)
            self._send_json({"ok": True, "id": next_id, "index": len(species) - 1})
            return

        if path == "/api/upload":
            body = self._read_json_body()
            filename = body.get("filename", "")
            data_url = body.get("dataUrl", "")
            if not SAFE_FILENAME.match(filename):
                self._send_json({"error": "invalid filename"}, 400)
                return
            m = re.match(r"^data:[^;]+;base64,(.+)$", data_url, re.S)
            if not m:
                self._send_json({"error": "invalid data URL"}, 400)
                return
            IMAGES_DIR.mkdir(exist_ok=True)
            (IMAGES_DIR / filename).write_bytes(base64.b64decode(m.group(1)))
            self._send_json({"ok": True, "path": f"images/{filename}"})
            return

        self._send_json({"error": "not found"}, 404)

    def do_PUT(self):
        m = re.match(r"^/api/species/(\d+)$", unquote(self.path))
        if not m:
            self._send_json({"error": "not found"}, 404)
            return
        index = int(m.group(1))
        record = self._read_json_body()
        species = load_species()
        if index < 0 or index >= len(species):
            self._send_json({"error": "index out of range"}, 404)
            return
        record.setdefault("id", species[index].get("id"))
        species[index] = record
        save_species(species)
        self._send_json({"ok": True})

    def do_DELETE(self):
        m = re.match(r"^/api/species/(\d+)$", unquote(self.path))
        if not m:
            self._send_json({"error": "not found"}, 404)
            return
        index = int(m.group(1))
        species = load_species()
        if index < 0 or index >= len(species):
            self._send_json({"error": "index out of range"}, 404)
            return
        species.pop(index)
        save_species(species)
        self._send_json({"ok": True})


def start_tunnel(port):
    """Launch a Cloudflare quick tunnel pointing at the local server and
    print its public URL once cloudflared reports it. Returns the
    subprocess so the caller can terminate it on shutdown."""
    import re as _re
    import threading

    try:
        proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", f"http://127.0.0.1:{port}", "--no-autoupdate"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except FileNotFoundError:
        print("cloudflared not found - install it or drop --tunnel", file=sys.stderr)
        return None

    url_pattern = _re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
    found = threading.Event()

    def watch():
        for line in proc.stdout:
            if not found.is_set():
                m = url_pattern.search(line)
                if m:
                    print(f"Temporary external URL: {m.group(0)}  (anyone with this link has full admin access - share carefully, stops working when you Ctrl+C)")
                    found.set()

    threading.Thread(target=watch, daemon=True).start()
    return proc


def _read_pid_file():
    """The PID in admin/server.pid, if it's still a live process. Cleans up
    (and returns None for) a stale file left by a process that's gone."""
    if not PID_FILE.exists():
        return None
    try:
        pid = int(PID_FILE.read_text(encoding="utf-8").strip())
    except (ValueError, OSError):
        PID_FILE.unlink(missing_ok=True)
        return None
    try:
        os.kill(pid, 0)
    except (ProcessLookupError, PermissionError):
        PID_FILE.unlink(missing_ok=True)
        return None
    return pid


def _child_pids(pid, pattern):
    try:
        out = subprocess.run(
            ["pgrep", "-P", str(pid), "-f", pattern], capture_output=True, text=True
        )
    except FileNotFoundError:
        return []
    return [int(p) for p in out.stdout.split() if p.isdigit()]


def stop_running():
    """Stop the instance tracked in admin/server.pid (and its tunnel)."""
    pid = _read_pid_file()
    if pid is None:
        print("Admin server is not running.")
        return

    tunnel_pids = _child_pids(pid, "cloudflared")

    print(f"Stopping admin server (pid {pid})...")
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    else:
        for _ in range(10):
            time.sleep(0.5)
            try:
                os.kill(pid, 0)
            except ProcessLookupError:
                break
        else:
            print(f"  pid {pid} didn't stop in time, forcing...")
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

    for tpid in tunnel_pids:
        try:
            os.kill(tpid, signal.SIGTERM)
        except ProcessLookupError:
            pass

    PID_FILE.unlink(missing_ok=True)
    print("Done.")


def restart_running(extra_args):
    """Stop any running instance, then start a fresh one in the background."""
    stop_running()

    print("Starting admin server...")
    with open(SERVER_LOG, "wb") as log:
        subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve())] + extra_args,
            stdout=log,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )

    for _ in range(10):
        time.sleep(0.5)
        pid = _read_pid_file()
        if pid is not None:
            print(f"Started (pid {pid}). Logs: {SERVER_LOG}")
            tail = SERVER_LOG.read_text(encoding="utf-8", errors="replace").splitlines()[-5:]
            print("\n".join(tail))
            return

    print(f"Failed to start - check {SERVER_LOG}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    if COMMAND == "stop":
        stop_running()
        sys.exit(0)

    if COMMAND == "restart":
        restart_running(_rest)
        sys.exit(0)

    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
    print(f"Admin server running at http://127.0.0.1:{PORT}  (Ctrl+C to stop)")

    tunnel_proc = start_tunnel(PORT) if TUNNEL else None
    if TUNNEL and tunnel_proc:
        print("Starting Cloudflare tunnel for temporary external access...")

    def _handle_sigterm(signum, frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, _handle_sigterm)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if tunnel_proc:
            tunnel_proc.terminate()
        PID_FILE.unlink(missing_ok=True)
