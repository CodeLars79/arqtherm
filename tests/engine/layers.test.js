import { describe, it, expect } from 'vitest';
import {
  mmToM,
  parseNumericInput,
  calculateLayerResistance,
  calculateFixedResistance,
  calculateTotalResistance,
  calculateUValue,
  calculateTotalThickness
} from '../../src/engine/index.js';

// Oráculos: aritmética de R = d/λ, RT = Rsi + ΣR + Rse, U = 1/RT hecha a mano.

describe('mmToM', () => {
  it('convierte milímetros a metros', () => {
    expect(mmToM(1000)).toBe(1);
    expect(mmToM(15)).toBeCloseTo(0.015, 12);
    expect(mmToM(0.5)).toBeCloseTo(0.0005, 12);
  });
});

describe('parseNumericInput', () => {
  it('acepta coma y punto decimal', () => {
    expect(parseNumericInput('0,035')).toBe(0.035);
    expect(parseNumericInput('0.035')).toBe(0.035);
    expect(parseNumericInput(' 120 ')).toBe(120);
  });
  it('rechaza entradas no numéricas sin sustituirlas', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('abc')).toBeNull();
    expect(parseNumericInput('1,2,3')).toBeNull();
    expect(parseNumericInput(NaN)).toBeNull();
    expect(parseNumericInput(Infinity)).toBeNull();
    expect(parseNumericInput(undefined)).toBeNull();
  });
});

describe('calculateLayerResistance', () => {
  it('100 mm de aislante λ = 0,040 → R = 0,100 / 0,040 = 2,5 m²·K/W', () => {
    const r = calculateLayerResistance(100, 0.04);
    expect(r.ok).toBe(true);
    expect(r.value).toBeCloseTo(2.5, 12);
  });
  it('15 mm de enlucido λ = 0,57 → R = 0,015 / 0,57', () => {
    const r = calculateLayerResistance(15, 0.57);
    expect(r.value).toBeCloseTo(0.015 / 0.57, 12);
    expect(r.value).toBeCloseTo(0.0263157894737, 10);
  });
  it('200 mm de hormigón λ = 2,30 → R = 0,2 / 2,3', () => {
    expect(calculateLayerResistance(200, 2.3).value).toBeCloseTo(0.0869565217391, 10);
  });
  it('rechaza espesor nulo, cero, negativo o no finito', () => {
    expect(calculateLayerResistance(null, 0.04).error.code).toBe('thickness-missing');
    expect(calculateLayerResistance(0, 0.04).error.code).toBe('thickness-invalid');
    expect(calculateLayerResistance(-10, 0.04).error.code).toBe('thickness-invalid');
    expect(calculateLayerResistance(NaN, 0.04).error.code).toBe('thickness-invalid');
    expect(calculateLayerResistance(Infinity, 0.04).error.code).toBe('thickness-invalid');
    expect(calculateLayerResistance('100', 0.04).error.code).toBe('thickness-invalid');
  });
  it('rechaza λ ausente, cero, negativa o no finita (evita división por cero)', () => {
    expect(calculateLayerResistance(100, undefined).error.code).toBe('lambda-missing');
    expect(calculateLayerResistance(100, 0).error.code).toBe('lambda-invalid');
    expect(calculateLayerResistance(100, -0.04).error.code).toBe('lambda-invalid');
    expect(calculateLayerResistance(100, NaN).error.code).toBe('lambda-invalid');
    expect(calculateLayerResistance(100, 0).value).toBeNull();
  });
});

describe('calculateFixedResistance', () => {
  it('devuelve la R tabulada dentro del rango de espesores', () => {
    expect(calculateFixedResistance(70, 0.16, [61, 90]).value).toBe(0.16);
  });
  it('rechaza espesores fuera del rango de validez', () => {
    const r = calculateFixedResistance(120, 0.16, [61, 90]);
    expect(r.ok).toBe(false);
    expect(r.error.code).toBe('thickness-out-of-range');
  });
});

describe('calculateTotalResistance y calculateUValue', () => {
  it('fachada: Rse 0,04 + 0,2/2,3 + 0,08/0,04 + Rsi 0,13', () => {
    const rs = [0.2 / 2.3, 0.08 / 0.04];
    const total = calculateTotalResistance(0.13, rs, 0.04);
    const expected = 0.04 + 0.2 / 2.3 + 2.0 + 0.13; // 2,256956521…
    expect(total.ok).toBe(true);
    expect(total.value).toBeCloseTo(expected, 12);
    expect(total.layersSum).toBeCloseTo(0.2 / 2.3 + 2, 12);
    const u = calculateUValue(total.value);
    expect(u.value).toBeCloseTo(1 / expected, 12);
    expect(u.value).toBeCloseTo(0.443075, 5);
  });
  it('sin capas no hay resultado', () => {
    expect(calculateTotalResistance(0.13, [], 0.04).error.code).toBe('no-layers');
  });
  it('rechaza resistencias de capa no válidas', () => {
    expect(calculateTotalResistance(0.13, [0.5, NaN], 0.04).ok).toBe(false);
    expect(calculateTotalResistance(0.13, [0.5, 0], 0.04).ok).toBe(false);
  });
  it('U no admite RT nula, negativa o infinita', () => {
    expect(calculateUValue(0).ok).toBe(false);
    expect(calculateUValue(-1).ok).toBe(false);
    expect(calculateUValue(Infinity).ok).toBe(false);
    expect(calculateUValue(0).value).toBeNull();
  });
});

describe('calculateTotalThickness', () => {
  it('suma espesores en mm', () => {
    expect(calculateTotalThickness([15, 115, 60, 20, 70, 15])).toBe(295);
  });
  it('devuelve null si falta algún espesor o la lista está vacía', () => {
    expect(calculateTotalThickness([15, null, 60])).toBeNull();
    expect(calculateTotalThickness([])).toBeNull();
    expect(calculateTotalThickness([15, -2])).toBeNull();
  });
});

describe('formatU', () => {
  it('muestra U con dos decimales, como los valores límite del DB-HE', async () => {
    const { formatU } = await import('../../src/engine/index.js');
    expect(formatU(0.4189)).toBe('0,42');
    expect(formatU(0.4189, 0.49)).toBe('0,42');
  });
  it('añade decimales cuando U y la referencia coinciden a dos decimales', async () => {
    const { formatU } = await import('../../src/engine/index.js');
    expect(formatU(0.4904, 0.49)).toBe('0,4904');
    expect(formatU(0.4914, 0.49)).toBe('0,491');
    expect(formatU(0.49, 0.49)).toBe('0,49');
  });
});
