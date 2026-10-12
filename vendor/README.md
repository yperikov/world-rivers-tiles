# vendor/ — third-party libraries, served from our own site

Unchanged copies of files from the npm packages below, so the page loads no code from a CDN
(vendored 2026-09-28; before, the same files came from jsdelivr, pinned with SRI hashes).
Each package sits in a folder named `<package>@<version>`: a new version gets a new address, so
browsers never mix old and new library files after a publish (the build's `?v=` cache-busting
covers only `css/` and `js/`).

Do not edit these files. Git keeps them byte for byte (`.gitattributes`: `web/** -text`) and
the build records their checksums in `pipeline/manifest/site.sha256`.

| Folder | npm tarball | npm `integrity` of the tarball | Licence |
|---|---|---|---|
| `maplibre-gl@6.11.2/` | https://registry.npmjs.org/maplibre-gl/-/maplibre-gl-6.11.2.tgz | `sha512-Xh06pxoipjX/Ad1sUPGhiNh9go9naCNGZZ1IJm3sIeqK1kYGuMaMDSTIGDQ2igOLfVyukJU7kvEOA089VO7Z7g==` | BSD-3-Clause (`LICENSE.txt`) |
| `geographiclib-geodesic@2.2.0/` | https://registry.npmjs.org/geographiclib-geodesic/-/geographiclib-geodesic-2.2.0.tgz | `sha512-cIedo9VTYb0DFufodgibDmVfsWe9EASqb/kUByl09xc6PZYvLvlc89BHCThtGTPf2OII/zWJGxsR3Uz6O7QOVw==` | MIT (`LICENSE.txt`) |

Files taken (from `package/dist/` for MapLibre, `package/` for GeographicLib, plus each
`LICENSE.txt`):

- `maplibre-gl.mjs`: the library, imported by `js/maplibre.js`.
- `maplibre-gl-shared.mjs`: code shared by the library and its worker; both import it as
  `./maplibre-gl-shared.mjs`.
- `maplibre-gl-worker.mjs`: the web worker. MapLibre finds it itself, next to
  `maplibre-gl.mjs` (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`), so the three
  files must stay together with these names.
- `maplibre-gl.css`: linked in `index.html`.
- `geographiclib-geodesic.min.js`: a plain `<script>` in `index.html`; sets `window.geodesic`.

Left out: the `-dev` builds, TypeScript types (`maplibre-gl.d.ts`, `types/`) and source maps
(`*.map`, ~10 MB). The files still end with `//# sourceMappingURL=...map`; browser developer
tools may note the missing map, which does not affect the page.

## Upgrading a library

1. Check the tarball URL and `integrity` at `https://registry.npmjs.org/<package>/<version>`
   (fields `dist.tarball`, `dist.integrity`), download the tarball and compare its SHA-512
   (`openssl dgst -sha512 -binary <file>.tgz | base64 -w0`).
2. Put the same files into a new `<package>@<version>/` folder and delete the old folder.
3. Change the version in every address: `js/maplibre.js` and the MapLibre stylesheet link in
   `index.html`, or the GeographicLib `<script>` in `index.html`.
4. Update this table, `notes/references.md` and the version notes in `js/README.md`; rebuild
   and re-test (`js/README.md`, *Things that are easy to break*).
