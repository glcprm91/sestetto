// Inserisce in dist/index.html l'HTML della pagina iniziale, generato con React lato server.
// L'app poi lo sostituisce al caricamento: serve a chi legge la pagina senza eseguire JavaScript.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ssrDir = `${root}.ssr`;
const page = `${root}dist/index.html`;

const { render } = await import(`${ssrDir}/entry-server.js`);
const html = await readFile(page, 'utf8');
const placeholder = '<div id="root"></div>';
if (!html.includes(placeholder)) throw new Error('Segnaposto <div id="root"></div> non trovato in dist/index.html');

await writeFile(page, html.replace(placeholder, `<div id="root">${render()}</div>`));
await rm(ssrDir, { recursive: true, force: true });
console.log('Pagina iniziale prerenderizzata in dist/index.html');
