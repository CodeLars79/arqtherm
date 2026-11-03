// Convierte dist-hosted/index.html (documento completo, generado con vite-plugin-singlefile)
// en un fragmento de página para alojarlo en un marco que ya aporta <html>, <head> y <body>.
import { readFileSync, writeFileSync } from 'node:fs';

const src = 'dist-hosted/index.html';
const out = 'dist-hosted/arqtherm.html';
const html = readFileSync(src, 'utf8');

// Límites por última aparición: el JS incrustado puede contener las cadenas «<head>» o «<body>».
const head = html.slice(html.indexOf('<head>') + 6, html.lastIndexOf('</head>'));
const body = html.slice(html.lastIndexOf('<body>') + 6, html.lastIndexOf('</body>'));

const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Arqtherm</title>';
const fontLinks = head.match(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/gi) ?? [];
const styles = head.match(/<style[\s\S]*?<\/style>/gi) ?? [];
const scripts = head.match(/<script[\s\S]*?<\/script>/gi) ?? [];

const fragment = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<meta name="description" content="Calculadora de transmitancia térmica (valor U) de código abierto orientada al CTE DB-HE.">',
  ...fontLinks,
  ...styles,
  body.trim(),
  ...scripts
].join('\n');

writeFileSync(out, fragment);
console.log(`Página alojada: ${out} (${(fragment.length / 1024).toFixed(0)} kB)`);
