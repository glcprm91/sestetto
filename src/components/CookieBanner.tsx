interface CookieBannerProps {
  onChoice: (analytics: boolean) => void;
}

/**
 * Richiesta di consenso per Google Analytics. Rifiuta e Accetta hanno lo
 * stesso peso; chiudere con la X equivale a rifiutare.
 */
export function CookieBanner({ onChoice }: CookieBannerProps) {
  return (
    <div className="cookie" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <button type="button" className="cookie__close" aria-label="Chiudi senza accettare" onClick={() => onChoice(false)}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <h2 id="cookie-title">Statistiche con Google Analytics</h2>
      <p id="cookie-text">
        Contiamo già le visite in forma anonima, senza cookie. Se accetti, usiamo anche Google Analytics, che salva cookie
        nel browser, per capire meglio come viene usato il sito. Puoi cambiare idea quando vuoi.{' '}
        <a href="/privacy">Informativa</a>
      </p>
      <div className="cookie__actions">
        <button type="button" className="btn" onClick={() => onChoice(false)}>
          Rifiuta
        </button>
        <button type="button" className="btn" onClick={() => onChoice(true)}>
          Accetta
        </button>
      </div>
    </div>
  );
}
