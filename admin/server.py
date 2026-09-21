#!/usr/bin/env python3
"""Local admin server for editing species content (data/species.json) and
photos (images/). Zero external dependencies - Python 3 stdlib only.

Usage:
    python3 admin/server.py [port]

Then open http://127.0.0.1:8800 in a browser. Binds to 127.0.0.1 only -
not reachable from other machines on the network.
"""
import base64
import json
import mimetypes
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
ADMIN_DIR = ROOT / "admin"
IMAGES_DIR = ROOT / "images"
SPECIES_JSON = ROOT / "data" / "species.json"

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800

SAFE_FILENAME = re.compile(r"^[A-Za-z0-9._\-&@]+\.(jpg|jpeg|png|gif|svg|webp)$", re.I)


def load_species():
    return json.loads(SPECIES_JSON.read_text(encoding="utf-8"))


def save_species(species):
    SPECIES_JSON.write_text(
        json.dumps(species, ensure_ascii=False, indent=2), encoding="utf-8"
    )


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type=None):
        if not path.is_file():
            self._send_json({"error": "not found"}, 404)
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header(
            "Content-Type", content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        )
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

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


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Admin server running at http://127.0.0.1:{PORT}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
