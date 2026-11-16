import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { resolveSiteUrl, SITE } from './site.config.ts';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Un contatto diventa un link se è un'email o un indirizzo web. */
function contactHtml(contact: string): string {
  const safe = escapeHtml(contact);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return `<a href="mailto:${safe}">${safe}</a>`;
  if (/^https?:\/\/\S+$/.test(contact)) return `<a href="${safe}">${safe}</a>`;
  return safe;
}

/** Tiene o toglie un blocco <!--se:nome-->…<!--/se:nome--> dell'HTML. */
function toggleBlock(html: string, name: string, keep: boolean): string {
  const pattern = new RegExp(`<!--se:${name}-->([\\s\\S]*?)<!--/se:${name}-->`, 'g');
  return html.replace(pattern, (_match, inner: string) => (keep ? inner : ''));
}

/**
 * Meta tag, dati strutturati, robots.txt e sitemap con l'indirizzo giusto,
 * più l'informativa privacy compilata con titolare e servizi attivi.
 */
function sitePlugin(env: Record<string, string>): Plugin {
  const url = resolveSiteUrl({ VITE_SITE_URL: env.VITE_SITE_URL, VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL });
  const owner = env.VITE_SITE_OWNER?.trim() ?? '';
  const contact = env.VITE_SITE_CONTACT?.trim() ?? '';
  const gaId = /^G-[A-Z0-9]{4,}$/.test(env.VITE_GA_ID?.trim() ?? '') ? env.VITE_GA_ID.trim() : '';
  const verification = env.VITE_GOOGLE_SITE_VERIFICATION?.trim() ?? '';
  const today = new Date().toISOString().slice(0, 10);

  return {
    name: 'sestetto-sito',

    buildStart() {
      if (this.environment?.name !== 'client') return;
      if (!owner || !contact) {
        this.warn('VITE_SITE_OWNER e VITE_SITE_CONTACT non sono impostate: l’informativa privacy non indica il titolare e Google Analytics resta spento.');
      } else if (env.VITE_GA_ID && !gaId) {
        this.warn(`VITE_GA_ID non valido ("${env.VITE_GA_ID}"): serve un ID di misurazione GA4 come G-XXXXXXXXXX.`);
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const structured = JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', name: SITE.name, url: `${url}/`, inLanguage: SITE.lang },
            {
              '@type': 'WebApplication',
              name: SITE.name,
              url: `${url}/`,
              description: SITE.description,
              image: `${url}/og-image.png`,
              inLanguage: SITE.lang,
              applicationCategory: 'SportsApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript',
              isAccessibleForFree: true,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            },
          ],
        });
        let out = html
          .replaceAll('__SITE_URL__', url)
          .replaceAll('__SITE_NAME__', escapeHtml(SITE.name))
          .replaceAll('__SITE_TITLE__', escapeHtml(SITE.title))
          .replaceAll('__SITE_DESCRIPTION__', escapeHtml(SITE.description))
          .replaceAll('__SITE_LOCALE__', SITE.locale)
          .replaceAll('__THEME_COLOR__', SITE.themeColor)
          .replaceAll('__OWNER__', escapeHtml(owner))
          .replaceAll('__CONTACT__', contactHtml(contact))
          .replace('<!--dati-strutturati-->', `<script type="application/ld+json">${structured.replace(/</g, '\\u003c')}</script>`)
          .replace(
            '<!--verifica-google-->',
            verification ? `<meta name="google-site-verification" content="${escapeHtml(verification)}" />` : '',
          );
        out = toggleBlock(out, 'titolare', Boolean(owner && contact));
        out = toggleBlock(out, 'google-analytics', Boolean(gaId && owner && contact));
        return out;
      },
    },

    generateBundle() {
      if (this.environment?.name !== 'client') return;
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url><loc>${url}/</loc><lastmod>${today}</lastmod></url>\n` +
          '</urlset>\n',
      });
    },
  };
}

/** Precarica il carattere usato per i titoli, così il testo principale non cambia aspetto dopo il caricamento. */
function preloadFont(): Plugin {
  return {
    name: 'sestetto-preload-font',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const font = Object.keys(ctx.bundle).find((name) => /archivo-latin-wdth-normal-.*\.woff2$/.test(name));
        if (!font) return html;
        return html.replace('</title>', `</title>\n    <link rel="preload" href="/${font}" as="font" type="font/woff2" crossorigin />`);
      },
    },
  };
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), sitePlugin(env), preloadFont()],
    build: isSsrBuild ? {} : { rollupOptions: { input: { main: 'index.html', privacy: 'privacy.html' } } },
    test: { environment: 'node' },
  };
});
