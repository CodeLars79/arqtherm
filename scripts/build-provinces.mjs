/**
 * Genera src/data/geo/spainProvinces.json: trazados SVG precalculados de las provincias
 * (IGN vía es-atlas, proyección geoConicConformalSpain con Canarias recolocada).
 * Ejecutar:  node scripts/build-provinces.mjs
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoPath } from 'd3-geo';
import geoConicConformalSpain from 'd3-composite-projections/src/conicConformalSpain.js';

const require = createRequire(import.meta.url);
const topo = require('es-atlas/es/provinces.json');
const W = 800;
const H = 620;

const fc = feature(topo, topo.objects.provinces);
fc.features = fc.features.filter((f) => f.id !== '54'); // Gibraltar: fuera del ámbito del CTE
const projection = geoConicConformalSpain().fitExtent([[8, 8], [W - 8, H - 8]], fc);
const path = geoPath(projection).digits(1);

const provinces = fc.features.map((f) => {
  const [cx, cy] = path.centroid(f);
  return { ineCode: f.id, name: f.properties.name, d: path(f), cx: Math.round(cx), cy: Math.round(cy) };
});

fs.mkdirSync('src/data/geo', { recursive: true });
fs.writeFileSync(
  'src/data/geo/spainProvinces.json',
  JSON.stringify({
    source: 'Instituto Geográfico Nacional (IGN), vía es-atlas 0.6.0',
    license: 'CC BY 4.0 · © Instituto Geográfico Nacional',
    viewBox: `0 0 ${W} ${H}`,
    canaryFrame: projection.getCompositionBorders(),
    provinces
  })
);
console.log(provinces.length, 'provincias,', fs.statSync('src/data/geo/spainProvinces.json').size, 'bytes');
