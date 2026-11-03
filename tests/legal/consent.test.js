import { describe, it, expect } from 'vitest';
import {
  createConsent, isConsentValid, readConsent, writeConsent, STORAGE_REGISTRY,
  CONSENT_KEY, PREFS_KEY, COOKIE_POLICY_VERSION
} from '../../src/legal/consent.js';
import { STORAGE_KEYS } from '../../src/hooks/useLocalStorage.js';
import { missingLegalFields } from '../../src/legal/legalConfig.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; }
  };
}

const NOW = new Date('2026-10-31T10:00:00Z');

describe('consent record', () => {
  it('records the choice, policy version and a 24-month expiry', () => {
    const c = createConsent({ preferences: true }, NOW);
    expect(c.policyVersion).toBe(COOKIE_POLICY_VERSION);
    expect(c.categories).toEqual({ necessary: true, preferences: true });
    expect(c.expiresAt.startsWith('2028-10-31')).toBe(true);
    expect(isConsentValid(c, NOW)).toBe(true);
  });
  it('expires and is invalidated by a new policy version', () => {
    const c = createConsent({ preferences: false }, NOW);
    expect(isConsentValid(c, new Date('2028-11-01T00:00:00Z'))).toBe(false);
    expect(isConsentValid({ ...c, policyVersion: '2000-01-01' }, NOW)).toBe(false);
  });
  it('treats missing, corrupt or malformed records as no decision', () => {
    expect(readConsent(memoryStorage(), NOW)).toBeNull();
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: '{oops' }), NOW)).toBeNull();
    expect(readConsent(memoryStorage({ [CONSENT_KEY]: JSON.stringify({ policyVersion: COOKIE_POLICY_VERSION }) }), NOW)).toBeNull();
    expect(readConsent(null, NOW)).toBeNull();
    const throwing = { getItem: () => { throw new Error('blocked'); } };
    expect(readConsent(throwing, NOW)).toBeNull();
  });
  it('round-trips and deletes preference data when preferences are rejected', () => {
    const s = memoryStorage({ [PREFS_KEY]: '{"zonesMapMode":"summer"}' });
    writeConsent(s, createConsent({ preferences: true }, NOW));
    expect(s.data[PREFS_KEY]).toBeDefined();
    expect(readConsent(s, NOW).categories.preferences).toBe(true);
    writeConsent(s, createConsent({ preferences: false }, NOW));
    expect(s.data[PREFS_KEY]).toBeUndefined();
    expect(readConsent(s, NOW).categories.preferences).toBe(false);
  });
});

describe('storage registry', () => {
  it('declares every key the app writes, each with a category and purpose', () => {
    const keys = STORAGE_REGISTRY.map((r) => r.key);
    for (const k of [...Object.values(STORAGE_KEYS), CONSENT_KEY, PREFS_KEY]) expect(keys).toContain(k);
    for (const r of STORAGE_REGISTRY) {
      expect(['necessary', 'preferences']).toContain(r.category);
      expect(r.purpose.length).toBeGreaterThan(10);
    }
  });
  it('reports missing owner details', () => {
    expect(missingLegalFields({ taxId: 'X', address: 'Y', email: null })).toEqual(['email']);
  });
});
