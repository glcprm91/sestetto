import type { SceneContext } from './domain/types';

const ATTACK_TEXT = { da4: 'da posto 4', da3: 'dal centro', da2: 'da posto 2' } as const;

/** Una riga che dice cosa mostra il campo: serve a schermo, in stampa e nell'immagine. */
export function sceneCaption(ctx: SceneContext): string {
  const rotation = `P${ctx.rotation}`;
  switch (ctx.phase) {
    case 'base':
      return `${rotation}, posizioni di base ${ctx.situation === 'battuta' ? 'in battuta' : 'in ricezione'}`;
    case 'ricezione':
      return `${rotation}, ricezione`;
    case 'attacco':
      return `${rotation}, attacco dopo la ricezione`;
    case 'battuta':
      return `${rotation}, battuta`;
    case 'contrattacco':
      return `${rotation}, contrattacco`;
    case 'difesa':
      if (ctx.attackFrom === 'freeball') return `${rotation}, free ball`;
      return ctx.attackFrom === 'attesa'
        ? `${rotation}, difesa ${ctx.situation === 'battuta' ? 'dopo la battuta' : 'dopo l’attacco'}`
        : `${rotation}, difesa su attacco ${ATTACK_TEXT[ctx.attackFrom]}`;
  }
}
