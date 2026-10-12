# AGENTS.md — web map (app source)

This folder is a static web page (no bundler, no npm): a MapLibre GL viewer of world rivers
tiles rendered from the QGIS project, with a 2D/3D (globe) switch, a real star sky, a scale
ruler and a distance-measuring tool.

**Three names** (the same as in FirstMap's root `AGENTS.md`):

- **app source**: `web/` in the FirstMap project (tracked in git since 2026-09-28), the code
  you edit.
- **built site**: `exports/tiles/` in FirstMap, made by the build (`uv run python
  scripts/build.py`, from the project root): the app source minus `web/dev/`, plus
  `stars.json` and the tile folders.
- **live site**: the separate repo `world-rivers-tiles`, a copy of the built site served on
  GitHub Pages. If you are reading this file there, change the app source in FirstMap's `web/`
  instead and rebuild.

**Read [js/README.md](js/README.md) first** — the file map, the module dependency graph,
pinned external libraries, and the "things that are easy to break" list (tile URLs must be
absolute, no `maxBounds`, `setProjection()` timing, MapLibre's ±85.05° drawing limit, NaN
start zoom on a hidden tab, the atmosphere halo, etc.). Background and full requirements are
in the parent project's `notes/web-globe-requirements.md` and `notes/lessons-learned.md`
(search *MapLibre viewer*).

**Cache-busting:** the build writes `?v=<checksum>` into the built site's `index.html` for every
`css/` and `js/` file (module imports through the import map), so browsers never mix old and
new code after a publish. Keep the `<link>` / `<script type="module">` tags in `index.html` in
their current simple form so the build finds them.

**Libraries are self-hosted:** MapLibre and GeographicLib are unchanged npm files in
`vendor/<package>@<version>/` (no CDN since 2026-09-28). Don't edit them; to upgrade, follow
[vendor/README.md](vendor/README.md) (new folder, then change the version in every address).

## Testing

From the FirstMap project root, build the built site (only the copy step runs if the tiles
are current), then serve it:

```bash
uv run python scripts/build.py
```

```bash
uv run python scripts/serve_tiles.py
```

then open `http://localhost:8765/index.html`. The local server also adds the developer tools
from `web/dev/` (the DEV button, top left: tile zoom/x/y labels); they are never put into the
built site (`--no-dev` shows the page as the live site has it). Do **not** use `python -m http.server` on this
machine — Windows serves `.js` files as `text/plain`, which silently breaks the ES modules
(blank page, no console error). Opening `index.html` as a `file://` page doesn't work either.
Stop the local server before building: the build replaces the `exports/tiles/` folder.

## Publishing

**Never push the live site** (`world-rivers-tiles`, the local checkout or GitHub) unless the
user explicitly says to push. A request to change, delete, or update the site is not
permission to push. Commit in that repo only when the user asks.

The live site (https://www.makeearthgreatagain.lol/, a custom domain: keep the `CNAME` file in
that repo; https://yperikov.github.io/world-rivers-tiles/ redirects there) is published from a
**separate git repository**, `world-rivers-tiles`, a sibling folder to `FirstMap` — not this
one. To update it: `uv run python scripts/publish.py` in FirstMap shows what would change, and
`--apply` copies the built site into that repo (only changed files; it removes files the built
site no longer has and never touches `CNAME` or `README.md`). It never commits or pushes: the
user does that. See `notes/web-globe-requirements.md` for the full checklist.
