import '@fontsource-variable/archivo/wdth.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startVercelAnalytics } from './analytics/vercel';
import App from './App';
import './styles.css';

// La pagina arriva già disegnata dalla build (vedi scripts/prerender.mjs): React la sostituisce
// con l'app vera, che legge le squadre salvate nel browser.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startVercelAnalytics();
