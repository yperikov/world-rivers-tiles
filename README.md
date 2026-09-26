# World Rivers (web tiles)

XYZ map tiles (zoom 0-7, JPEG) of a world rivers map made in QGIS, with a MapLibre GL JS viewer (`index.html`): a 3D globe among real stars with a 2D/3D switch (`#globe` / `#flat` in the URL).

Live: https://yperikov.github.io/world-rivers-tiles/

Code: static files, no build step. `index.html` + `css/` + `js/` (one ES module per feature); see [js/README.md](js/README.md) for how it fits together. Also: a scale ruler, a distance measuring tool (WGS84 geodesics via GeographicLib) and a panel with the coordinates and terrain height under the pointer (hover with a mouse, tap on a phone).

Data: [Natural Earth](https://www.naturalearthdata.com/) (public domain).

Stars (3D view): Yale Bright Star Catalogue, 5th revised ed. (Hoffleit & Warren 1991), via [CDS](https://cdsarc.cds.unistra.fr/viz-bin/cat/V/50), in `stars.json`.

Terrain height (panel in the bottom right corner): [Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/) (Mapzen; built from SRTM, GMTED, ETOPO1 and other sources, see the [attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)), fetched by the page at run time.
