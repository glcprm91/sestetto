import { checkPositions, type PairCheck } from './faults';
import { positionRulesApply, sceneKey, scenePositions } from './formations';
import { onCourt, type OnCourt } from './lineup';
import { PHASES, type Positions, type SceneContext, type Team } from './types';

export interface Scene {
  ctx: SceneContext;
  /** Dove sta ogni giocatore in campo. */
  positions: Positions;
  court: OnCourt;
  /** Posizioni del momento precedente, per disegnare gli spostamenti. */
  previous: Positions | null;
  /** Controllo dei falli di posizione; null quando le regole non valgono. */
  checks: PairCheck[] | null;
  /** La squadra ha spostato a mano qualcuno in questa scena. */
  customized: boolean;
}

/** Il momento che precede questa scena nella sequenza di gioco, se esiste. */
export function previousContext(ctx: SceneContext): SceneContext | null {
  if (ctx.phase === 'difesa' && ctx.attackFrom !== 'attesa') return { ...ctx, attackFrom: 'attesa' };
  const phases = PHASES[ctx.situation];
  const index = phases.indexOf(ctx.phase);
  if (index <= 0) return null;
  return { ...ctx, phase: phases[index - 1], attackFrom: 'attesa' };
}

export function buildScene(team: Team, ctx: SceneContext): Scene {
  const court = onCourt(ctx.rotation, ctx.situation, team.useLibero);
  const positions = scenePositions(team, ctx);
  const before = previousContext(ctx);
  const checks = positionRulesApply(ctx)
    ? checkPositions(court.byZone, positions, { serverExempt: ctx.phase === 'battuta' })
    : null;
  return {
    ctx,
    positions,
    court,
    previous: before ? scenePositions(team, before) : null,
    checks,
    customized: Boolean(team.custom[sceneKey(ctx, team.defenseSystem)]),
  };
}
