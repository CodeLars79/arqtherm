// Inter (SIL Open Font License 1.1), subconjunto Latin + griego + símbolos técnicos.
// Se incrustan en el PDF para representar λ, ², ≤, θ, Σ, etc.
import { regular, semibold, bold } from './fontData.js';

/** Registra las tipografías en un documento jsPDF. */
export function registerFonts(doc) {
  doc.addFileToVFS('Inter-Regular.ttf', regular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-SemiBold.ttf', semibold);
  doc.addFont('Inter-SemiBold.ttf', 'InterSemi', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
}
