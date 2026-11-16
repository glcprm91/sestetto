import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from '../../site.config';
import { CONSENT_DURATION, validConsent } from './consent';
import { privacyUrl } from './privacyUrl';

describe('statistiche', () => {
  it('agli strumenti di statistica non arrivano i dati della squadra nel link', () => {
    expect(privacyUrl('https://sestetto.vercel.app/#squadra=eyJuYW1lIjoiVm9sbGV5In0')).toBe('https://sestetto.vercel.app/');
    expect(privacyUrl('https://sestetto.vercel.app/privacy?utm_source=x#top')).toBe('https://sestetto.vercel.app/privacy');
    expect(privacyUrl('non è un indirizzo#segreto')).toBe('non è un indirizzo');
  });

  it('un rifiuto vale sei mesi, un consenso un anno', () => {
    const now = Date.UTC(2026, 10, 16);
    const day = 24 * 60 * 60 * 1000;
    expect(validConsent({ analytics: false, at: now - 179 * day }, now)).toEqual({ analytics: false, at: now - 179 * day });
    expect(validConsent({ analytics: false, at: now - CONSENT_DURATION.refused }, now)).toBeNull();
    expect(validConsent({ analytics: true, at: now - 300 * day }, now)).not.toBeNull();
    expect(validConsent({ analytics: true, at: now - CONSENT_DURATION.accepted }, now)).toBeNull();
  });

  it('una scelta salvata male va chiesta di nuovo', () => {
    const now = Date.UTC(2026, 10, 16);
    for (const record of [null, 'sì', { analytics: 'true', at: now }, { analytics: true }, { analytics: true, at: now + 1000 }]) {
      expect(validConsent(record, now)).toBeNull();
    }
  });
});

describe('indirizzo del sito', () => {
  it('su Vercel usa il dominio di produzione, salvo indicazione diversa', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'sestetto.vercel.app' })).toBe('https://sestetto.vercel.app');
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'sestetto.it', VITE_SITE_URL: 'https://www.sestetto.it/' })).toBe('https://www.sestetto.it');
    expect(resolveSiteUrl({})).toBe('https://sestetto.vercel.app');
  });
});
