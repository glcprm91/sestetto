import { backRowMiddle, frontRowMiddle, isFrontRow, lineup, onCourt, zoneOf, ZONES } from './lineup';
import type {
  AttackFrom,
  DefenseSystem,
  PlayerId,
  Point,
  Positions,
  RoleId,
  Rotation,
  SceneContext,
  Situation,
  Team,
  Zone,
} from './types';

const p = (x: number, y: number): Point => ({ x, y });

/* -------------------------------------------------------------------------- */
/* Base: ognuno al centro della propria zona                                   */
/* -------------------------------------------------------------------------- */

export const ZONE_CENTER: Record<Zone, Point> = {
  4: p(1.5, 1.7),
  3: p(4.5, 1.7),
  2: p(7.5, 1.7),
  5: p(1.5, 6.3),
  6: p(4.5, 6.3),
  1: p(7.5, 6.3),
};

function basePositions(rotation: Rotation): Record<RoleId, Point> {
  const result = {} as Record<RoleId, Point>;
  const byZone = lineup(rotation);
  for (const zone of ZONES) result[byZone[zone]] = ZONE_CENTER[zone];
  return result;
}

/* -------------------------------------------------------------------------- */
/* Ricezione a tre (due schiacciatori e il libero)                             */
/* -------------------------------------------------------------------------- */

/** CA = centrale di prima linea, CD = centrale di seconda linea (o il libero al suo posto). */
type ReceptionSlot = 'P' | 'O' | 'S1' | 'S2' | 'CA' | 'CD';

const RECEPTION: Record<Rotation, Record<ReceptionSlot, Point>> = {
  // Palleggiatore dietro S1, che arretra a ricevere a destra. Opposto a rete in 4.
  1: { P: p(8.2, 6.7), S1: p(6.9, 5.5), CA: p(3.6, 1.0), O: p(0.9, 1.6), S2: p(1.9, 5.7), CD: p(4.5, 6.2) },
  // Palleggiatore nascosto dietro l'opposto, pronto a salire a rete.
  6: { S1: p(7.0, 5.7), CA: p(7.9, 1.2), O: p(5.0, 0.9), S2: p(1.7, 5.3), CD: p(4.2, 6.3), P: p(6.0, 2.4) },
  // Palleggiatore a sinistra dietro il centrale: deve attraversare verso la zona di alzata.
  5: { CD: p(7.1, 5.7), O: p(8.1, 1.4), S2: p(2.0, 5.3), CA: p(0.9, 0.9), P: p(1.9, 2.6), S1: p(4.6, 6.3) },
  // Palleggiatore e centrale stretti a sinistra, così S2 riceve a sinistra e attacca da 4.
  4: { O: p(8.2, 7.6), S2: p(2.3, 5.4), CA: p(1.6, 2.5), P: p(0.6, 0.9), S1: p(4.6, 6.3), CD: p(7.0, 5.7) },
  // Palleggiatore già a rete al centro; opposto dietro, tra libero e S2.
  3: { S2: p(7.1, 5.5), CA: p(7.6, 1.4), P: p(5.0, 0.9), S1: p(1.8, 5.3), CD: p(4.3, 6.2), O: p(5.9, 7.7) },
  // Palleggiatore già a rete a destra; opposto dietro a sinistra.
  2: { CD: p(7.1, 5.6), P: p(7.6, 0.9), S1: p(2.0, 5.3), CA: p(0.9, 1.6), O: p(2.6, 7.8), S2: p(4.6, 6.3) },
};

/** I tre ricevitori, da sinistra a destra. */
export function receivers(rotation: Rotation): ('S1' | 'S2' | 'CD')[] {
  const slots: ('S1' | 'S2' | 'CD')[] = ['S1', 'S2', 'CD'];
  return slots.sort((a, b) => RECEPTION[rotation][a].x - RECEPTION[rotation][b].x);
}

function receptionPositions(rotation: Rotation): Record<RoleId, Point> {
  const table = RECEPTION[rotation];
  const result = { P: table.P, O: table.O, S1: table.S1, S2: table.S2 } as Record<RoleId, Point>;
  result[frontRowMiddle(rotation)] = table.CA;
  result[backRowMiddle(rotation)] = table.CD;
  return result;
}

/* -------------------------------------------------------------------------- */
/* Attacco dopo la ricezione                                                   */
/* -------------------------------------------------------------------------- */

export type AttackSlot = 'alzata' | 'posto4' | 'centro' | 'posto2' | 'secondaLinea' | 'pipe' | 'copertura';

const ATTACK: Record<AttackSlot, Point> = {
  alzata: p(6.2, 0.7),
  posto4: p(0.9, 1.2),
  centro: p(4.9, 0.9),
  posto2: p(8.2, 1.2),
  secondaLinea: p(7.9, 3.6),
  pipe: p(4.4, 3.7),
  copertura: p(2.8, 4.8),
};

/** Chi fa cosa in attacco, rotazione per rotazione. */
export function attackRoles(rotation: Rotation): Partial<Record<AttackSlot, RoleId>> {
  const frontHitter: RoleId = isFrontRow(zoneOf('S1', rotation)) ? 'S1' : 'S2';
  const backHitter: RoleId = frontHitter === 'S1' ? 'S2' : 'S1';
  const roles: Partial<Record<AttackSlot, RoleId>> = {
    alzata: 'P',
    centro: frontRowMiddle(rotation),
    pipe: backHitter,
    copertura: backRowMiddle(rotation),
  };
  if (rotation === 1) {
    // In P1 l'opposto è in posto 4 e lo schiacciatore in 2: attaccano da dove sono.
    roles.posto4 = 'O';
    roles.posto2 = frontHitter;
  } else {
    roles.posto4 = frontHitter;
    if (isFrontRow(zoneOf('O', rotation))) roles.posto2 = 'O';
    else roles.secondaLinea = 'O';
  }
  return roles;
}

function attackPositions(rotation: Rotation): Record<RoleId, Point> {
  const result = {} as Record<RoleId, Point>;
  const roles = attackRoles(rotation);
  for (const slot of Object.keys(roles) as AttackSlot[]) result[roles[slot]!] = ATTACK[slot];
  return result;
}

/* -------------------------------------------------------------------------- */
/* Battuta                                                                     */
/* -------------------------------------------------------------------------- */

/** Chi batte è libero da vincoli di posizione; gli altri restano in ordine di rotazione. */
const SERVE: Record<Zone, Point> = {
  1: p(7.6, 9.7),
  2: p(6.2, 0.9),
  3: p(4.5, 0.9),
  4: p(2.8, 0.9),
  5: p(2.3, 5.8),
  6: p(5.0, 6.5),
};

function servePositions(rotation: Rotation): Record<RoleId, Point> {
  const result = {} as Record<RoleId, Point>;
  const byZone = lineup(rotation);
  for (const zone of ZONES) result[byZone[zone]] = SERVE[zone];
  return result;
}

/* -------------------------------------------------------------------------- */
/* Difesa: dopo il cambio ognuno gioca nel proprio posto                        */
/* -------------------------------------------------------------------------- */

/** Posti di difesa: sinistra/centro/destra, avanti (A) e dietro (D). */
export type DefenseSlot = 'SA' | 'CA' | 'DA' | 'SD' | 'CD' | 'DD';

/**
 * A rete: schiacciatore a sinistra, centrale al centro, palleggiatore od
 * opposto a destra. Dietro: libero (o centrale) in 5, schiacciatore in 6,
 * palleggiatore od opposto in 1.
 */
export function defenseRoles(rotation: Rotation): Record<DefenseSlot, RoleId> {
  const frontHitter: RoleId = isFrontRow(zoneOf('S1', rotation)) ? 'S1' : 'S2';
  const setterFront = isFrontRow(zoneOf('P', rotation));
  return {
    SA: frontHitter,
    CA: frontRowMiddle(rotation),
    DA: setterFront ? 'P' : 'O',
    SD: backRowMiddle(rotation),
    CD: frontHitter === 'S1' ? 'S2' : 'S1',
    DD: setterFront ? 'O' : 'P',
  };
}

type DefenseTable = Record<DefenseSlot, Point>;

const mirror = (t: DefenseTable): DefenseTable => {
  const m = (pt: Point) => p(Math.round((9 - pt.x) * 10) / 10, pt.y);
  return { SA: m(t.DA), CA: m(t.CA), DA: m(t.SA), SD: m(t.DD), CD: m(t.CD), DD: m(t.SD) };
};

/** L'attacco avversario da posto 4 arriva sulla nostra destra. */
const DEFENSE_DA4: Record<DefenseSystem, DefenseTable> = {
  // Posto 6 arretrato: muro a due, fuori muro sui tre metri, tre difensori sul perimetro.
  arretrato: { DA: p(8.2, 0.6), CA: p(7.0, 0.6), SA: p(3.0, 2.9), DD: p(8.2, 5.6), CD: p(5.0, 8.3), SD: p(1.3, 6.3) },
  // Posto 6 avanzato: il 6 copre i pallonetti dietro il muro, 1 e 5 difendono lunghi.
  avanzato: { DA: p(8.2, 0.6), CA: p(7.0, 0.6), SA: p(2.6, 3.4), CD: p(6.9, 3.0), DD: p(7.9, 7.2), SD: p(1.6, 7.2) },
};

const DEFENSE: Record<DefenseSystem, Record<Exclude<AttackFrom, 'freeball'>, DefenseTable>> = {
  arretrato: {
    attesa: { SA: p(1.6, 0.9), CA: p(4.5, 0.9), DA: p(7.4, 0.9), SD: p(1.5, 5.6), CD: p(4.5, 7.6), DD: p(7.5, 5.6) },
    da4: DEFENSE_DA4.arretrato,
    da2: mirror(DEFENSE_DA4.arretrato),
    da3: { CA: p(4.5, 0.6), SA: p(3.3, 0.7), DA: p(5.7, 0.7), SD: p(1.7, 5.2), DD: p(7.3, 5.2), CD: p(4.5, 8.0) },
  },
  avanzato: {
    attesa: { SA: p(1.6, 0.9), CA: p(4.5, 0.9), DA: p(7.4, 0.9), SD: p(1.5, 6.4), CD: p(4.5, 4.2), DD: p(7.5, 6.4) },
    da4: DEFENSE_DA4.avanzato,
    da2: mirror(DEFENSE_DA4.avanzato),
    da3: { CA: p(4.5, 0.6), SA: p(3.3, 0.7), DA: p(5.7, 0.7), CD: p(4.5, 3.6), SD: p(1.9, 6.6), DD: p(7.1, 6.6) },
  },
};

/**
 * Free ball: gli avversari non riescono ad attaccare e mandano una palla
 * facile. Chi era a muro si stacca dalla rete per prendere la rincorsa, il
 * palleggiatore va in zona di alzata e dietro si riceve.
 */
const FREE_BALL: Record<'palleggiatoreAvanti' | 'palleggiatoreDietro', DefenseTable> = {
  // Palleggiatore già a rete (posto 2): l'opposto riceve con libero e schiacciatore.
  palleggiatoreAvanti: { DA: p(6.2, 0.7), SA: p(1.1, 3.4), CA: p(4.2, 2.7), SD: p(2.3, 6.2), CD: p(4.9, 6.7), DD: p(7.5, 5.6) },
  // Palleggiatore che sale da posto 1: l'opposto si stacca per attaccare da posto 2.
  palleggiatoreDietro: { DD: p(6.2, 0.7), DA: p(8.0, 3.3), SA: p(1.1, 3.4), CA: p(4.2, 2.7), SD: p(3.0, 6.2), CD: p(6.1, 6.4) },
};

/**
 * Contrattacco: dopo il muro o la difesa si riparte per attaccare. I ruoli
 * sono già cambiati, quindi lo schiacciatore attacca sempre da posto 4.
 */
const COUNTER_ATTACK: Record<'palleggiatoreAvanti' | 'palleggiatoreDietro', DefenseTable> = {
  palleggiatoreAvanti: { DA: ATTACK.alzata, SA: ATTACK.posto4, CA: ATTACK.centro, DD: ATTACK.secondaLinea, CD: ATTACK.pipe, SD: ATTACK.copertura },
  palleggiatoreDietro: { DD: ATTACK.alzata, SA: ATTACK.posto4, CA: ATTACK.centro, DA: ATTACK.posto2, CD: ATTACK.pipe, SD: ATTACK.copertura },
};

const setterRow = (rotation: Rotation) => (isFrontRow(zoneOf('P', rotation)) ? 'palleggiatoreAvanti' : 'palleggiatoreDietro');

function bySlot(rotation: Rotation, table: DefenseTable): Record<RoleId, Point> {
  const roles = defenseRoles(rotation);
  const result = {} as Record<RoleId, Point>;
  for (const slot of Object.keys(roles) as DefenseSlot[]) result[roles[slot]] = table[slot];
  return result;
}

function defensePositions(rotation: Rotation, attackFrom: AttackFrom, system: DefenseSystem): Record<RoleId, Point> {
  const table = attackFrom === 'freeball' ? FREE_BALL[setterRow(rotation)] : DEFENSE[system][attackFrom];
  return bySlot(rotation, table);
}

function counterAttackPositions(rotation: Rotation): Record<RoleId, Point> {
  return bySlot(rotation, COUNTER_ATTACK[setterRow(rotation)]);
}

/** Da dove arriva la palla avversaria, appena oltre la rete. */
export const ATTACK_ORIGIN: Record<Exclude<AttackFrom, 'attesa'>, Point> = {
  da4: p(8.2, -0.2),
  da3: p(4.5, -0.2),
  da2: p(0.8, -0.2),
  freeball: p(4.5, -0.2),
};

/* -------------------------------------------------------------------------- */
/* Scena completa                                                              */
/* -------------------------------------------------------------------------- */

function rolePositions(ctx: SceneContext, system: DefenseSystem): Record<RoleId, Point> {
  switch (ctx.phase) {
    case 'base':
      return basePositions(ctx.rotation);
    case 'ricezione':
      return receptionPositions(ctx.rotation);
    case 'attacco':
      return attackPositions(ctx.rotation);
    case 'battuta':
      return servePositions(ctx.rotation);
    case 'difesa':
      return defensePositions(ctx.rotation, ctx.attackFrom, system);
    case 'contrattacco':
      return counterAttackPositions(ctx.rotation);
  }
}

/** Chiave sotto cui si salvano le posizioni spostate a mano per una scena. */
export function sceneKey(ctx: SceneContext, system: DefenseSystem): string {
  // La free ball non dipende dal sistema di difesa; il contrattacco nemmeno da cosa hanno fatto gli avversari.
  const variant = ctx.phase !== 'difesa' ? '-' : ctx.attackFrom === 'freeball' ? 'freeball' : `${ctx.attackFrom}-${system}`;
  return [ctx.situation, ctx.phase, variant, ctx.rotation].join('/');
}

export function noteKey(situation: Situation, rotation: Rotation): string {
  return `${situation}/${rotation}`;
}

/** Posizioni previste dallo schema, senza le modifiche della squadra. */
export function defaultPositions(ctx: SceneContext, system: DefenseSystem, useLibero: boolean): Positions {
  const byRole = rolePositions(ctx, system);
  const { replaced } = onCourt(ctx.rotation, ctx.situation, useLibero);
  const result: Positions = {};
  for (const role of Object.keys(byRole) as RoleId[]) {
    const player: PlayerId = role === replaced ? 'L' : role;
    result[player] = byRole[role];
  }
  return result;
}

/** Posizioni mostrate: lo schema, con sopra le modifiche fatte a mano. */
export function scenePositions(team: Team, ctx: SceneContext): Positions {
  const defaults = defaultPositions(ctx, team.defenseSystem, team.useLibero);
  const custom = team.custom[sceneKey(ctx, team.defenseSystem)];
  if (!custom) return defaults;
  const result: Positions = {};
  for (const id of Object.keys(defaults) as PlayerId[]) result[id] = custom[id] ?? defaults[id];
  return result;
}

/** Le regole di posizione valgono solo al momento della battuta. */
export function positionRulesApply(ctx: SceneContext): boolean {
  return ctx.phase === 'base' || ctx.phase === 'ricezione' || ctx.phase === 'battuta';
}
