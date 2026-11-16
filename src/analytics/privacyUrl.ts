/**
 * Indirizzo da inviare alle statistiche: senza query e senza la parte dopo #,
 * dove il link condiviso porta i nomi della squadra.
 */
export function privacyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0];
  }
}
