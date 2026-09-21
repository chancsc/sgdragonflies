#!/usr/bin/env python3
"""Regenerate scripts/data.js from data/*.json, and refresh the Service
Worker's precache list + cache version. Run this after editing content
with admin/server.py, before committing/publishing.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_JS = ROOT / "scripts" / "data.js"
SW_JS = ROOT / "sw.js"


def build_data_js():
    flight = json.loads((DATA_DIR / "flight.json").read_text(encoding="utf-8"))
    probability = json.loads((DATA_DIR / "probability.json").read_text(encoding="utf-8"))
    species = json.loads((DATA_DIR / "species.json").read_text(encoding="utf-8"))

    # JSON is valid JS object/array literal syntax, so this is a plain string
    # assembly - no special serialization needed for the browser to load it.
    js = (
        "app=window.app||{},app.data=app.data||{},"
        "app.data.flight=" + json.dumps(flight, ensure_ascii=False) + ","
        "app.data.probability=" + json.dumps(probability, ensure_ascii=False) + ","
        "app.data.species=" + json.dumps(species, ensure_ascii=False) + ";\n"
    )
    DATA_JS.write_text(js, encoding="utf-8")
    print(f"wrote {DATA_JS.relative_to(ROOT)} ({len(species)} species, {len(js)} bytes)")


def build_precache_list():
    exclude_names = {"sw.js", "appcache.html", "appcache.manifest"}
    files = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        parts = rel.parts
        if parts[0] in (".git", "admin", "data"):
            continue
        if any(part.startswith(".") for part in parts):
            continue
        if p.name in exclude_names:
            continue
        files.append("./" + rel.as_posix())

    files.sort()
    files.insert(0, "./")

    entries = ",\n".join(f"  '{f}'" for f in files)
    new_block = "var PRECACHE_URLS = [\n" + entries + "\n];"

    sw_text = SW_JS.read_text(encoding="utf-8")
    sw_text, n = re.subn(
        r"var PRECACHE_URLS = \[\n.*?\n\];", new_block, sw_text, flags=re.S
    )
    if n != 1:
        raise SystemExit("could not find PRECACHE_URLS block in sw.js")

    m = re.search(r"sgdragonfly-shell-v(\d+)", sw_text)
    if not m:
        raise SystemExit("could not find CACHE_VERSION in sw.js")
    next_version = int(m.group(1)) + 1
    sw_text = sw_text.replace(m.group(0), f"sgdragonfly-shell-v{next_version}")

    SW_JS.write_text(sw_text, encoding="utf-8")
    print(f"wrote {SW_JS.relative_to(ROOT)} ({len(files)} precached files, cache v{next_version})")


if __name__ == "__main__":
    build_data_js()
    build_precache_list()
    print("done - review the diff, then commit and push (or ask Claude to).")
