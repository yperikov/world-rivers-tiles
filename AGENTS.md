# AGENTS.md — web app

This folder is a static web page (no bundler, no npm): a MapLibre GL viewer of world rivers
tiles rendered from the QGIS project, with a 2D/3D (globe) switch, a real star sky, a scale
ruler and a distance-measuring tool.

**Where the source lives:** `web/` in the FirstMap project (tracked in git since 2026-09-28).
The FirstMap build (`uv run python scripts/build.py`, from the project root) copies it into the
site folder `exports/tiles/` together with `stars.json` and the tile folders. The published
repo `world-rivers-tiles` is a copy of that built site: if you are reading this file there,
change the code in FirstMap's `web/` instead and rebuild.

**Read [js/README.md](js/README.md) first** — the file map, the module dependency graph,
pinned external libraries, and the "things that are easy to break" list (tile URLs must be
absolute, no `maxBounds`, `setProjection()` timing, MapLibre's ±85.05° drawing limit, NaN
start zoom on a hidden tab, the atmosphere halo, etc.). Background and full requirements are
in the parent project's `notes/web-globe-requirements.md` and `notes/lessons-learned.md`
(search *MapLibre viewer*).

**Cache-busting:** the build writes `?v=<checksum>` into the site's `index.html` for every
`css/` and `js/` file (module imports through the import map), so browsers never mix old and
new code after a publish. Keep the `<link>` / `<script type="module">` tags in `index.html` in
their current simple form so the build finds them.

**Library integrity:** `index.html` pins MapLibre and GeographicLib on jsdelivr with SRI
hashes (MapLibre's module files through the import map). Upgrading a library means changing
the version and its hash together; the comment in `index.html` says where the hashes come from.

## Testing

From the FirstMap project root, build the site (only the copy step runs if the tiles are
current), then serve it:

```bash
uv run python scripts/build.py
```

```bash
uv run python scripts/serve_tiles.py
```

then open `http://localhost:8765/index.html`. Do **not** use `python -m http.server` on this
machine — Windows serves `.js` files as `text/plain`, which silently breaks the ES modules
(blank page, no console error). Opening `index.html` as a `file://` page doesn't work either.
Stop the local server before building: the build replaces the `exports/tiles/` folder.

## Publishing

**Never push the web app** (`world-rivers-tiles`, the local checkout or GitHub) unless the
user explicitly says to push. A request to change, delete, or update the site is not
permission to push. Commit in that repo only when the user asks.

The live site (https://www.makeearthgreatagain.lol/, a custom domain: keep the `CNAME` file in
that repo; https://yperikov.github.io/world-rivers-tiles/ redirects there) is published from a
**separate git repository**, `world-rivers-tiles`, a sibling folder to `FirstMap` — not this
one. To update it, after the user has asked to push: copy the built site (`exports/tiles/`:
`index.html`, `stars.json`, `css/`, `js/`, this `AGENTS.md`, and the tile folders if they were
re-rendered) into that repo, commit, and push. See `notes/web-globe-requirements.md` for the
full checklist.
