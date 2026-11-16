/**
 * Guida breve alle rotazioni: serve a chi arriva per la prima volta e ai
 * motori di ricerca, che altrimenti vedrebbero solo il campo.
 */
export function Guide() {
  return (
    <section className="guide" aria-labelledby="guide-title">
      <h2 id="guide-title">Come funzionano le rotazioni nella pallavolo</h2>

      <div className="guide__howto">
        <h3>Come si usa Sestetto</h3>
        <p>
          Scegli se la squadra è in ricezione o in battuta, il momento dell&apos;azione e la rotazione. Scrivi i nomi nella
          sezione Squadra: compaiono sul campo al posto dei ruoli. Seleziona un giocatore per vedere fin dove può spostarsi e
          trascinalo. Tutto resta salvato nel tuo browser; per passare la squadra a qualcuno usa «Copia link della squadra».
        </p>
      </div>

      <div className="guide__grid">
        <article>
          <h3>Le sei zone e il giro</h3>
          <p>
            Ogni metà campo è divisa in sei zone. A rete, guardando verso gli avversari, ci sono da sinistra la 4, la 3 e la
            2; dietro la 5, la 6 e la 1. Quando la squadra riconquista il servizio dopo averlo perso, i giocatori ruotano di
            un posto in senso orario: chi era in zona 2 passa in zona 1 e va a battere.
          </p>
        </article>

        <article>
          <h3>Il sistema 5-1</h3>
          <p>
            Si gioca con un palleggiatore, un opposto, due schiacciatori, due centrali e il libero. Palleggiatore e opposto
            sono sempre in diagonale, come i due schiacciatori e i due centrali. La rotazione prende il nome dalla zona del
            palleggiatore e in partita si susseguono P1, P6, P5, P4, P3 e P2.
          </p>
          <p>
            Con il palleggiatore in seconda linea (P1, P6, P5) a rete ci sono tre attaccanti. Quando è in prima linea (P4,
            P3, P2) gli attaccanti a rete sono due e l&apos;opposto attacca da seconda linea.
          </p>
        </article>

        <article>
          <h3>La ricezione a tre</h3>
          <p>
            Ricevono i due schiacciatori e il libero. Palleggiatore, opposto e centrale di prima linea si spostano per
            lasciare loro il campo, e il palleggiatore parte il più vicino possibile alla zona di alzata. Ogni rotazione ha
            una sua disposizione, perché chi non riceve deve comunque rispettare l&apos;ordine di rotazione al momento della
            battuta.
          </p>
        </article>

        <article>
          <h3>Il libero</h3>
          <p>
            Entra al posto del centrale di seconda linea e gioca solo dietro: non può battere, murare né attaccare con la
            palla interamente sopra il bordo superiore della rete. Per questo, quando il centrale di seconda linea arriva in
            zona 1 e deve battere, il libero resta fuori.
          </p>
        </article>

        <article>
          <h3>I falli di posizione</h3>
          <p>
            Contano solo nell&apos;istante in cui la palla viene colpita in battuta, per entrambe le squadre e con
            l&apos;esclusione di chi batte. Ogni giocatore di prima linea deve stare più vicino alla rete del compagno dietro
            di lui (4 davanti a 5, 3 davanti a 6, 2 davanti a 1) e, sulla stessa linea, va rispettato l&apos;ordine da
            sinistra a destra. Conta la posizione dei piedi a terra. Subito dopo la battuta ci si muove liberamente.
          </p>
        </article>

        <article>
          <h3>Free ball e contrattacco</h3>
          <p>
            Quando gli avversari non riescono ad attaccare e rimandano una palla facile, chi era a muro si stacca dalla rete
            per prendere la rincorsa e il palleggiatore va in zona di alzata. Il contrattacco è l&apos;azione che segue una
            difesa o un muro: i giocatori sono già nei loro posti, quindi lo schiacciatore attacca da posto 4 e l&apos;opposto
            da posto 2 o da seconda linea.
          </p>
        </article>

      </div>
    </section>
  );
}
