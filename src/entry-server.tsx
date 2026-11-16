import { renderToString } from 'react-dom/server';
import App from './App';

/** HTML della pagina iniziale, scritto in index.html in fase di build: lo leggono subito i motori di ricerca. */
export function render(): string {
  return renderToString(<App />);
}
