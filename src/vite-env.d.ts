/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_SITE_OWNER?: string;
  readonly VITE_SITE_CONTACT?: string;
  readonly VITE_GA_ID?: string;
  /** Messo a 1 solo per l'anteprima autonoma, dove gli script di statistica non hanno senso. */
  readonly VITE_DISABLE_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
