import { describe, it, expect } from 'vitest';
import { insulationHatchPoints, insulationHatchPath, HATCH_PITCH } from '../../src/report/insulationHatch.js';

describe('símbolo de aislamiento', () => {
  it.each([[12, 60], [40, 62], [120, 62], [300, 90]])('ocupa todo el ancho y cubre el alto (w=%s, h=%s)', (w, h) => {
    const pts = insulationHatchPoints(w, h);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...xs)).toBeLessThanOrEqual(w + 1e-9);
    expect(Math.min(...xs)).toBeLessThan(w * 0.002);
    expect(Math.max(...xs)).toBeGreaterThan(w * 0.998);
    expect(Math.min(...ys)).toBeLessThan(0);
    expect(Math.max(...ys)).toBeGreaterThan(h);
  });
  it('el paso vertical es proporcional al ancho', () => {
    // dos extremos izquierdos consecutivos (x mínima) separados por 0,404·w
    const w = 100;
    const pts = insulationHatchPoints(w, 400);
    const minima = pts.filter((p, i) => i > 0 && i < pts.length - 1 && p[0] <= pts[i - 1][0] && p[0] < pts[i + 1][0]).map((p) => p[1]);
    expect(minima[1] - minima[0]).toBeCloseTo(HATCH_PITCH * w, 1);
  });
  it('sin dimensiones no hay trazado', () => {
    expect(insulationHatchPoints(0, 10)).toEqual([]);
    expect(insulationHatchPath(10, 0)).toBe('');
  });
});
