# Sestetto

Le sei rotazioni della pallavolo in ricezione, attacco, battuta e difesa, con i nomi della propria squadra al posto dei ruoli.

"Sestetto" è un nome provvisorio: per cambiarlo basta modificare `SITE_NAME` in `src/App.tsx` e i testi in `index.html`.

## Cosa fa

- **Rotazioni**: da P1 a P6 nell'ordine di gioco (P1 → P6 → P5 → P4 → P3 → P2), con i giocatori che si spostano in modo animato.
- **In ricezione**: base → ricezione a tre → attacco → difesa → contrattacco.
- **In battuta**: base → battuta → difesa → contrattacco.
- **Difesa**: in attesa, su attacco avversario da posto 4, dal centro o da posto 2 (con posto 6 arretrato o avanzato), oppure su free ball.
- **Contrattacco**: la ripartenza dopo il muro, la difesa o la free ball, con i ruoli già cambiati.
- **Squadra**: nome e numero di maglia per ogni ruolo, più squadre, libero attivabile, colori per ruolo o per genere (misto).
- **Spostare un giocatore**: lo si seleziona sul campo e compare il suo range. In base, ricezione e battuta è l'area in cui non commette fallo di posizione rispetto ai compagni vicini; a palla in gioco è un cerchio attorno alla posizione dello schema, con raggio regolabile da 1 a 6 metri. Lo spostamento vale per quella squadra, rotazione e momento, e si annulla con «Riporta allo schema». I limiti si possono disattivare dalla sezione Vista: in quel caso un fallo di posizione viene segnalato.
- **Falli di posizione**: le coppie di giocatori vincolate vengono collegate in verde o in rosso.
- **Appunti** per ogni rotazione, vista con tutte e sei le rotazioni, stampa, immagine PNG e link per passare la squadra a qualcun altro.

Non c'è un server: squadre, nomi e posizioni restano nel browser di chi usa il sito (`localStorage`).

## Sviluppo

Serve Node 20.19 o successivo.

```bash
npm install
npm run dev      # sito in locale
npm test         # controlli su rotazioni, libero, formazioni e falli
npm run build    # versione da pubblicare, nella cartella dist
```

## Pubblicazione su Vercel

1. Carica questa cartella in un repository GitHub.
2. Su Vercel: Add New → Project → importa il repository.
3. Vercel riconosce Vite da solo (build `npm run build`, cartella `dist`): conferma con Deploy.

Ogni push sul ramo principale ripubblica il sito.

## Dove mettere le mani

| Cosa | File |
| --- | --- |
| Ordine di rotazione e regole del libero | `src/domain/lineup.ts` |
| Posizioni di ricezione, attacco, battuta e difesa | `src/domain/formations.ts` |
| Controllo dei falli di posizione | `src/domain/faults.ts` |
| Range entro cui si sposta un giocatore | `src/domain/range.ts` |
| Testi di spiegazione sotto il campo | `src/domain/hints.ts` |
| Colori del campo e dei ruoli | `src/theme.ts` |
| Disegno del campo | `src/components/Court.tsx` |

Le coordinate sono in metri sulla propria metà campo: `x` da 0 (linea laterale sinistra) a 9, `y` da 0 (rete) a 9 (linea di fondo). Dopo ogni modifica alle posizioni conviene lanciare `npm test`: verifica che base, ricezione e battuta non contengano falli di posizione.

## Schemi e crediti

Gli schemi sono quelli del 5-1 con ricezione a tre (due schiacciatori e il libero). Il progetto riprende l'idea di [Rotazioni volley](https://rotazioni.volleyserve.it/) di napo, che a sua volta deriva da [VBRotations](https://github.com/monkeysppp/VBRotations) di Andy Edwards; il codice e le coordinate di questo sito sono stati scritti da zero e non includono parti di quei progetti.

Il carattere è [Archivo](https://fonts.google.com/specimen/Archivo) (SIL Open Font License).
