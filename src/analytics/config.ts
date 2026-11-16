const env = import.meta.env;

const gaId = env.VITE_GA_ID?.trim() ?? '';

/** ID di misurazione GA4 valido, oppure stringa vuota. */
export const GA_ID = /^G-[A-Z0-9]{4,}$/.test(gaId) ? gaId : '';

/** Google Analytics si accende solo se l'informativa indica titolare e contatto. */
export const GA_ENABLED = Boolean(GA_ID && env.VITE_SITE_OWNER?.trim() && env.VITE_SITE_CONTACT?.trim());

export const ANALYTICS_DISABLED = env.VITE_DISABLE_ANALYTICS === '1';
