import type { PlayerId, Positions, Zone } from './types';

export interface PairCheck {
  a: PlayerId;
  b: PlayerId;
  /** 'lato': a deve stare a sinistra di b. 'rete': a deve stare più vicino alla rete di b. */
  kind: 'lato' | 'rete';
  ok: boolean;
}

/** Coppie di zone vicine sulla stessa linea: la prima sta a sinistra della seconda. */
export const SIDE_PAIRS: [Zone, Zone][] = [
  [4, 3],
  [3, 2],
  [5, 6],
  [6, 1],
];

/** Coppie avanti/dietro: la prima sta più vicina alla rete della seconda. */
export const DEPTH_PAIRS: [Zone, Zone][] = [
  [4, 5],
  [3, 6],
  [2, 1],
];

export const MARGIN = 0.05;

/**
 * Controllo dei falli di posizione al momento della battuta (regola 7.4):
 * ogni giocatore di prima linea deve stare più vicino alla rete del
 * corrispondente di seconda linea, e sulla stessa linea chi è a destra o a
 * sinistra deve restare dal proprio lato rispetto al giocatore centrale.
 * Il regolamento guarda i piedi; qui si confronta il centro del giocatore.
 * Chi batte è esente.
 */
export function checkPositions(
  byZone: Record<Zone, PlayerId>,
  positions: Positions,
  options: { serverExempt: boolean },
): PairCheck[] {
  const checks: PairCheck[] = [];
  const skip = (zone: Zone) => options.serverExempt && zone === 1;

  for (const [left, right] of SIDE_PAIRS) {
    if (skip(left) || skip(right)) continue;
    const a = byZone[left];
    const b = byZone[right];
    const pa = positions[a];
    const pb = positions[b];
    if (!pa || !pb) continue;
    checks.push({ a, b, kind: 'lato', ok: pa.x < pb.x - MARGIN });
  }

  for (const [front, back] of DEPTH_PAIRS) {
    if (skip(front) || skip(back)) continue;
    const a = byZone[front];
    const b = byZone[back];
    const pa = positions[a];
    const pb = positions[b];
    if (!pa || !pb) continue;
    checks.push({ a, b, kind: 'rete', ok: pa.y < pb.y - MARGIN });
  }

  return checks;
}
