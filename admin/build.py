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
    species = json.loads((DATA_DIR / "species.json").read_text(encoding="utf-8"))

    # JSON is valid JS object/array literal syntax, so this is a plain string
    # assembly - no special serialization needed for the browser to load it.
    js = (
        "app=window.app||{},app.data=app.data||{},"
        "app.data.species=" + json.dumps(species, ensure_ascii=False) + ";\n"
    )
    DATA_JS.write_text(js, encoding="utf-8")
    print(f"wrote {DATA_JS.relative_to(ROOT)} ({len(species)} species, {len(js)} bytes)")


def replace_url_block(sw_text, name, urls):
    entries = ",\n".join(f"  '{u}'" for u in urls)
    new_block = f"var {name} = [\n" + entries + "\n];"
    sw_text, n = re.subn(
        rf"var {name} = \[\n.*?\n\];", lambda _m: new_block, sw_text, flags=re.S
    )
    if n != 1:
        raise SystemExit(f"could not find {name} block in sw.js")
    return sw_text


def build_precache_list():
    """Split files into the small app shell (precached on install and refreshed
    on every release) and the species photos (kept in their own long-lived cache
    and filled in gradually, so a release doesn't re-download ~35 MB)."""
    species = json.loads((DATA_DIR / "species.json").read_text(encoding="utf-8"))
    photo_paths = set()
    for rec in species:
        for path in [rec.get("profile_pic")] + list(rec.get("gallery") or []):
            if path:
                photo_paths.add(path)

    exclude_names = {"sw.js"}
    shell, photos = [], []
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
        (photos if rel.as_posix() in photo_paths else shell).append("./" + rel.as_posix())

    shell.sort()
    shell.insert(0, "./")
    photos.sort()

    sw_text = SW_JS.read_text(encoding="utf-8")
    sw_text = replace_url_block(sw_text, "PRECACHE_URLS", shell)
    sw_text = replace_url_block(sw_text, "PHOTO_URLS", photos)

    m = re.search(r"sgdragonfly-shell-v(\d+)", sw_text)
    if not m:
        raise SystemExit("could not find CACHE_VERSION in sw.js")
    next_version = int(m.group(1)) + 1
    sw_text = sw_text.replace(m.group(0), f"sgdragonfly-shell-v{next_version}")

    SW_JS.write_text(sw_text, encoding="utf-8")
    print(f"wrote {SW_JS.relative_to(ROOT)} ({len(shell)} shell files, {len(photos)} photos, cache v{next_version})")


if __name__ == "__main__":
    build_data_js()
    build_precache_list()
    print("done - review the diff, then commit and push (or ask Claude to).")
