// Genera src/report/fontData.js con las tipografías del informe en base64.
// Ejecutar tras cambiar los archivos de src/report/fonts/: node scripts/encode-fonts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const files = {
  regular: 'src/report/fonts/Inter-400Regular.ttf',
  semibold: 'src/report/fonts/Inter-600SemiBold.ttf',
  bold: 'src/report/fonts/Inter-700Bold.ttf'
};
const lines = [
  '// Archivo generado por scripts/encode-fonts.mjs. No editar a mano.',
  '// Inter © The Inter Project Authors — SIL Open Font License 1.1 (véase src/report/fonts/OFL.txt).'
];
for (const [k, p] of Object.entries(files)) {
  lines.push(`export const ${k} = '${readFileSync(p).toString('base64')}';`);
}
writeFileSync('src/report/fontData.js', lines.join('\n') + '\n');
console.log('src/report/fontData.js generado');
