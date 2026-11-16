/** Scelta sui cookie di Google Analytics, salvata nel browser. */
export interface ConsentRecord {
  analytics: boolean;
  /** Momento della scelta, in millisecondi. */
  at: number;
}

const KEY = 'sestetto:consenso';
const DAY = 24 * 60 * 60 * 1000;

/** Un rifiuto vale sei mesi (indicazione del Garante), un'accettazione un anno. */
export const CONSENT_DURATION = { refused: 180 * DAY, accepted: 365 * DAY };

/** La scelta ancora valida, oppure null se va chiesta di nuovo. */
export function validConsent(record: unknown, now: number): ConsentRecord | null {
  if (!record || typeof record !== 'object') return null;
  const { analytics, at } = record as Partial<ConsentRecord>;
  if (typeof analytics !== 'boolean' || typeof at !== 'number' || !Number.isFinite(at) || at > now) return null;
  const duration = analytics ? CONSENT_DURATION.accepted : CONSENT_DURATION.refused;
  return now - at < duration ? { analytics, at } : null;
}

export function readConsent(now = Date.now()): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? validConsent(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean, now = Date.now()): ConsentRecord {
  const record = { analytics, at: now };
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Senza memoria la scelta vale solo per questa visita.
  }
  return record;
}
