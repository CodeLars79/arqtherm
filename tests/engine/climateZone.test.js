import { describe, it, expect } from 'vitest';
import { parseZoneCode, zoneForAltitude, formatBand, bandsAreContiguous } from '../../src/engine/index.js';
import climateZones from '../../src/data/cte/climateZones.json';
import geo from '../../src/data/geo/spainProvinces.json';

const byCode = Object.fromEntries(climateZones.provinces.map((p) => [p.ineCode, p]));

describe('climate zones dataset', () => {
  it('covers the 50 provinces plus Ceuta and Melilla', () => {
    expect(climateZones.provinces).toHaveLength(52);
  });
  it('every province has contiguous bands and valid zone codes', () => {
    for (const p of climateZones.provinces) {
      expect(bandsAreContiguous(p.bands), p.name).toBe(true);
      for (const b of p.bands) expect(parseZoneCode(b.zone), `${p.name} ${b.zone}`).not.toBeNull();
    }
  });
  it('every map shape has zone data and vice versa', () => {
    const geoCodes = geo.provinces.map((g) => g.ineCode).sort();
    expect(geoCodes).toEqual(Object.keys(byCode).sort());
  });
});

describe('zoneForAltitude', () => {
  it('applies inclusive band limits (Albacete)', () => {
    const p = byCode['02'];
    expect(zoneForAltitude(p, 0).zone).toBe('C3');
    expect(zoneForAltitude(p, 450).zone).toBe('C3');
    expect(zoneForAltitude(p, 451).zone).toBe('D3');
    expect(zoneForAltitude(p, 950).zone).toBe('D3');
    expect(zoneForAltitude(p, 951).zone).toBe('E1');
    expect(zoneForAltitude(p, 2500).zone).toBe('E1');
  });
  it('matches well-known capital zones', () => {
    const cases = { '28': 'D3', '08': 'C2', '46': 'B3', '41': 'B4', '29': 'A3', '09': 'E1', '35': 'α3', '04': 'A4' };
    for (const [code, zone] of Object.entries(cases)) {
      const p = byCode[code];
      expect(zoneForAltitude(p, p.capitalReferenceAltitudeM).zone, p.name).toBe(zone);
    }
  });
  it('handles single-zone territories and invalid input', () => {
    expect(zoneForAltitude(byCode['24'], 1800).zone).toBe('E1');
    expect(zoneForAltitude(byCode['02'], -5)).toBeNull();
    expect(zoneForAltitude(byCode['02'], 'abc')).toBeNull();
    expect(zoneForAltitude(null, 100)).toBeNull();
  });
});

describe('formatting', () => {
  it('formats bands and parses codes', () => {
    expect(formatBand({ minM: null, maxM: 450 })).toBe('≤ 450 m');
    expect(formatBand({ minM: 451, maxM: 950 })).toBe('451–950 m');
    expect(formatBand({ minM: 1001, maxM: null })).toBe('≥ 1001 m');
    expect(parseZoneCode('α3')).toEqual({ winter: 'α', summer: 3 });
    expect(parseZoneCode('F9')).toBeNull();
  });
});
