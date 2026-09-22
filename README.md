# Dragonflies of Singapore

A mobile-first field guide for identifying dragonflies and damselflies recorded in
Singapore — 138 species (52 damselflies, 86 dragonflies), each with photos, a
description, habitat, distribution, and similar/confusable species.

**Live app:** https://chancsc.github.io/sgdragonflies/

This is a static, installable web app (PWA) — no account, no backend, works offline
once loaded.

## Features

- Browse the full species list, filterable and sortable
- Species detail pages: photo gallery, description, habitat, distribution, and
  linked "confusion species"
- A quick-reference guide to telling dragonflies and damselflies apart, anatomy
  diagrams, and a glossary of technical terms
- Favourites, installable to the home screen, and fully usable offline via a
  Service Worker
- A local content-editing tool for updating species data and photos without
  touching code (see [Editing content](#editing-content) below)

## Tech stack

This app has two layers with very different vintages:

### The core app (2014-era, still what actually runs)

- **[jQuery Mobile 1.4.5](https://jquerymobile.com/)** — page transitions and
  touch-friendly UI widgets (listviews, panels, buttons)
- **[Backbone.js 1.1.2](https://backbonejs.org/)** + **[Underscore.js 1.8.2](https://underscorejs.org/)** —
  Views, a Router, and precompiled Underscore templates
- **[RequireJS 2.1.16](https://requirejs.org/)** (AMD) — module loading during
  development; for production everything is concatenated (not minified) into
  one file, `scripts/main-built.js`, via the RequireJS optimizer
- **[PhotoSwipe](https://photoswipe.com/)** — full-screen photo gallery/lightbox
- **[jquery.touchSwipe](https://github.com/mattbryson/TouchSwipe-Jquery-Plugin) 1.6.12** —
  swipe gestures for the species photo carousel
- **[FastClick](https://github.com/ftlabs/fastclick)** — removes the ~300ms tap
  delay on older mobile browsers

### The 2026 UI refresh (newer pages, framework-free)

A handful of pages (species list, species detail, the dragonfly/damselfly
differences page, splash screen, and the info/about/credits pages) were given a
visual refresh in plain HTML/CSS/JS, deliberately **without** adding a framework:

- `styles/refresh.css` — all new styling, scoped under `.rf-*` classes so it
  can't leak into or clash with the untouched legacy pages
- `scripts/refresh.js` — the one bit of new interactivity (the segmented
  toggle on the differences page), using plain delegated `click` events on
  `document` so it doesn't depend on the RequireJS/Backbone boot sequence

### Offline / installable (PWA)

- `manifest.json` — home-screen install metadata
- `sw.js` — a hand-maintained Service Worker that precaches the entire app
  shell plus all ~290 species photos for offline use. This replaces the
  original HTML5 AppCache approach (`appcache.manifest`, kept only for
  historical reference — no longer used by any browser)

### Content pipeline

- `data/species.json` is the **source of truth** for species content (name,
  taxon, family, description, habitat, distribution, confusion species, photo
  credits, colour tags)
- `admin/` is a small, zero-dependency (Python standard library only) local
  tool — a server plus a browser UI — for adding, editing, and deleting
  species and uploading photos, writing straight to `data/species.json`. It
  never runs in production and isn't reachable over the network.
- `admin/build.py` regenerates `scripts/data.js` (what the live site actually
  loads — **don't hand-edit it**) from `data/species.json`, and refreshes
  `sw.js`'s precache file list and cache-busting version

### Deployment

A static site on **GitHub Pages**, served directly from this repo's default
branch. No build step, no CI — pushing to `main` deploys within about a
minute.

### A quirk worth knowing if you touch templates

`scripts/main-built.js` bundles its own inline copy of every page template
(baked in when it was originally built with the RequireJS optimizer).
`scripts/templates.js` also exists, contains the same templates in a much
more readable form, and looks like it should be the live source — but the
browser never actually fetches it at runtime; `main-built.js`'s inline copy
is what renders. **Any HTML template change needs to be made in both files**
to keep them in sync until this gets untangled properly.

## Project structure

```
index.html              App shell, splash screen, meta/PWA/Open Graph tags
manifest.json           PWA install manifest
sw.js                   Service Worker (offline cache)
scripts/
  main-built.js         The whole app: Backbone views/router + inline templates (see quirk above)
  templates.js           Same templates, human-readable — kept in sync by hand, not actually loaded
  data.js                GENERATED from data/species.json — do not hand-edit (see admin/build.py)
  refresh.js             Small vanilla-JS behaviour for the refreshed pages
  debug-errors.js         Opt-in on-page error banner (add ?debug=1 to the URL to see it)
  libs/                  RequireJS loader
styles/
  main.min.css           Original jQuery Mobile + legacy app styles
  refresh.css            2026 UI refresh, scoped under .rf-*
data/
  species.json           Source of truth for all species content
  flight.json, probability.json   Inherited from the original build; currently unused/empty
admin/                   Local-only content editor (see admin/README.md)
images/                  ~290 species photos + app icons/logos
appcache.html, appcache.manifest   Legacy, superseded by sw.js — kept for reference
```

## Running locally

No build step — it's static files. From the repo root:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Editing content

See [`admin/README.md`](admin/README.md) for the full workflow. Short version:

```bash
python3 admin/server.py   # opens an editor at http://127.0.0.1:8800
# make your changes, then:
python3 admin/build.py    # regenerates scripts/data.js and sw.js
git add -A && git commit -m "Update species content" && git push
```

## Data & references

Species text and taxonomy draw on:

- Tang, H.B., Wang, L.K. & Hämäläinen, M., *A Photographic Guide to the
  Dragonflies of Singapore* (2010), Raffles Museum of Biodiversity Research
- Orr, A.G., *Dragonflies of Peninsular Malaysia and Singapore* (2005)
- Cross-checked against Ngiam, R.W.J. & Davison, G.W.H., *A Checklist of
  Dragonflies in Singapore Parks* (2011), Nature in Singapore, 4: 349–353

Full acknowledgements, including every photo contributor, are listed in the
app itself under **App Info → Acknowledgements** (`#credits`).

## Contributing

Issues and pull requests are welcome — species corrections, new photos (via
the admin tool), bug fixes, or further UI work in the same spirit as the 2026
refresh (framework-free, scoped under `.rf-*`, and kept in sync between
`templates.js`/`main-built.js` per the quirk above).

## License

**Code** (everything except `images/`) is licensed under the [MIT License](LICENSE).

**Photos and other media in `images/` are not covered by the MIT license.**
They're contributed by many photographers, each individually credited on
their species page and in the app's Acknowledgements screen, and remain that
photographer's copyright. Don't reuse them outside this app without checking
with the credited photographer.

One thing worth flagging for whoever formally adopts this license: this
app's original framework was adapted from a UK Biological Records Centre
(BRC) mobile app template (see the in-app About page and `admin/README.md`'s
history). If any of that inherited scaffolding is still subject to separate
terms, that would take precedence over the MIT license for those specific
parts — worth a quick check before treating the whole codebase as freely
reusable.
