/**
 * Dati del sito usati in fase di build (meta tag, sitemap, informativa) e nell'app.
 *
 * L'indirizzo pubblico si ricava da solo su Vercel (dominio di produzione del
 * progetto); per forzarne uno diverso impostare la variabile VITE_SITE_URL.
 */
export const SITE = {
  name: 'Sestetto',
  /** Titolo della pagina nei risultati di ricerca: resta sotto i 60 caratteri. */
  title: 'Rotazioni pallavolo 5-1 in ricezione e difesa | Sestetto',
  /** Descrizione nei risultati di ricerca: sotto i 160 caratteri. */
  description:
    'Le sei rotazioni della pallavolo nel 5-1: ricezione a tre, attacco, battuta, difesa e free ball. Inserisci i nomi della tua squadra e sposta i giocatori.',
  tagline: 'Rotazioni e posizioni della pallavolo',
  /** Usato solo se non si è su Vercel e VITE_SITE_URL non è impostata. */
  fallbackUrl: 'https://sestetto.vercel.app',
  lang: 'it',
  locale: 'it_IT',
  themeColor: '#0F1B31',
} as const;

/** Indirizzo pubblico senza barra finale. */
export function resolveSiteUrl(env: { VITE_SITE_URL?: string; VERCEL_PROJECT_PRODUCTION_URL?: string }): string {
  const explicit = env.VITE_SITE_URL?.trim();
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (vercel ? `https://${vercel.replace(/^https?:\/\//, '')}` : SITE.fallbackUrl);
  return url.replace(/\/+$/, '');
}
