import { inject } from '@vercel/analytics';
import { ANALYTICS_DISABLED } from './config';
import { privacyUrl } from './privacyUrl';

/** Statistiche anonime di Vercel: niente cookie, quindi niente consenso. */
export function startVercelAnalytics(): void {
  if (ANALYTICS_DISABLED) return;
  inject({
    mode: import.meta.env.PROD ? 'production' : 'development',
    beforeSend: (event) => ({ ...event, url: privacyUrl(event.url) }),
  });
}
