# Content admin tool

Edits species content (name, description, photos, etc.) without touching any
JS. This replaces the spreadsheet that used to feed the site.

## Before you start

Sync your branch with the latest `main` first, so you're editing on top of
anyone else's already-merged changes instead of an outdated copy:

```
admin/rebase.sh
```

Uncommitted changes are stashed and restored automatically, so it's safe to
run any time — do this before every editing session, not just the first one.
Pass a branch name (`admin/rebase.sh develop`) to rebase onto something other
than `main`.

## Edit content

```
python3 admin/server.py
```

Open http://127.0.0.1:8800 in a browser. Runs on your machine only (not
reachable from the network). Pick a species on the left to edit it, or
"+ Add" for a new one. Photo pickers upload straight into `images/`.
Changes save immediately to `data/species.json` — there's no separate
"draft" state.

To stop the server, run `admin/stop.sh` (or just Ctrl+C in the terminal
it's running in). If it was started with `--tunnel`, this also cleans up
the Cloudflare tunnel process.

To restart it (e.g. after pulling changes to `admin/server.py`/`admin/app.js`,
or if it was left running in the background), run `admin/stop.sh --restart`.
It stops any running instance, then starts a fresh one in the background,
logging to `admin/server.log`. Extra arguments are forwarded to
`server.py` — e.g. `admin/stop.sh --restart 8801 --tunnel`.

### Temporary external access

To let someone else reach the admin UI (e.g. for remote content editing),
start it with `--tunnel`:

```
python3 admin/server.py --tunnel
```

This opens a Cloudflare quick tunnel (requires the `cloudflared` binary)
and prints a random `https://<random>.trycloudflare.com` URL that forwards
to your local server. The tunnel closes and the URL stops working as soon
as you stop the server (Ctrl+C). There's no login on the admin server, so
anyone with that URL while it's running has full edit access — only share
it with people you trust, and only for as long as you need.

## Publish

After you're done editing:

```
python3 admin/build.py
```

This regenerates `scripts/data.js` (what the live site actually loads) from
`data/species.json`, and refreshes `sw.js`'s offline cache list/version.
Then commit and push as usual:

```
git add -A
git commit -m "Update species content"
git push
```

(Or ask Claude to do the build + push for you.) GitHub Pages rebuilds
automatically within about a minute of the push.

## Notes

- `scripts/data.js` is now a **generated file** — don't hand-edit it, your
  changes will be overwritten next time `admin/build.py` runs. Edit
  `data/species.json` (via the admin UI, or directly) instead.
- Species `id` values are preserved as-is when editing (some old links like
  `#species/42` rely on them); new species just get the next unused id.
- Deleting a species does not delete its photo files from `images/` — they're
  just left there unused. Fine for now.
