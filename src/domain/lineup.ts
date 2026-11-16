import type { PlayerId, RoleId, Rotation, Situation, Zone } from './types';

/**
 * Ordine di servizio del 5-1 classico: con il palleggiatore in posto 1,
 * S1 è in 2, C2 in 3, l'opposto in 4, S2 in 5 e C1 in 6.
 * S1 e C1 sono i due giocatori accanto al palleggiatore.
 */
export const SERVICE_ORDER: RoleId[] = ['P', 'S1', 'C2', 'O', 'S2', 'C1'];

/** L'ordine in cui le rotazioni si susseguono in partita. */
export const ROTATION_ORDER: Rotation[] = [1, 6, 5, 4, 3, 2];

export const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];

const mod6 = (n: number) => ((n % 6) + 6) % 6;

/** Zona occupata da un ruolo quando il palleggiatore è in `rotation`. */
export function zoneOf(role: RoleId, rotation: Rotation): Zone {
  const index = SERVICE_ORDER.indexOf(role);
  const turns = mod6(1 - rotation);
  return (mod6(index - turns) + 1) as Zone;
}

/** Chi occupa ogni zona in una rotazione. */
export function lineup(rotation: Rotation): Record<Zone, RoleId> {
  const result = {} as Record<Zone, RoleId>;
  for (const role of SERVICE_ORDER) result[zoneOf(role, rotation)] = role;
  return result;
}

export const isFrontRow = (zone: Zone) => zone === 2 || zone === 3 || zone === 4;

/** Dopo un cambio palla si ruota in senso orario: il palleggiatore passa da 1 a 6, da 6 a 5… */
export function nextRotation(rotation: Rotation): Rotation {
  return ROTATION_ORDER[(ROTATION_ORDER.indexOf(rotation) + 1) % 6];
}

export function prevRotation(rotation: Rotation): Rotation {
  return ROTATION_ORDER[(ROTATION_ORDER.indexOf(rotation) + 5) % 6];
}

export function frontRowMiddle(rotation: Rotation): 'C1' | 'C2' {
  return isFrontRow(zoneOf('C1', rotation)) ? 'C1' : 'C2';
}

export function backRowMiddle(rotation: Rotation): 'C1' | 'C2' {
  return isFrontRow(zoneOf('C1', rotation)) ? 'C2' : 'C1';
}

/**
 * Il centrale sostituito dal libero, oppure null se il libero resta fuori:
 * succede quando la squadra non lo usa, o quando il centrale di seconda
 * linea è in posto 1 e deve battere (il libero non può servire).
 */
export function liberoReplaces(rotation: Rotation, situation: Situation, useLibero: boolean): RoleId | null {
  if (!useLibero) return null;
  const middle = backRowMiddle(rotation);
  if (situation === 'battuta' && zoneOf(middle, rotation) === 1) return null;
  return middle;
}

export interface OnCourt {
  /** Zona di rotazione di ogni giocatore in campo (il libero eredita quella del centrale). */
  zones: Partial<Record<PlayerId, Zone>>;
  /** Giocatore in ogni zona. */
  byZone: Record<Zone, PlayerId>;
  /** Centrale uscito per il libero, se c'è. */
  replaced: RoleId | null;
  /** Chi è fuori dal campo in questo momento. */
  bench: PlayerId[];
}

export function onCourt(rotation: Rotation, situation: Situation, useLibero: boolean): OnCourt {
  const replaced = liberoReplaces(rotation, situation, useLibero);
  const zones: Partial<Record<PlayerId, Zone>> = {};
  const byZone = {} as Record<Zone, PlayerId>;
  for (const role of SERVICE_ORDER) {
    const zone = zoneOf(role, rotation);
    const player: PlayerId = role === replaced ? 'L' : role;
    zones[player] = zone;
    byZone[zone] = player;
  }
  const bench: PlayerId[] = replaced ? [replaced] : useLibero ? ['L'] : [];
  return { zones, byZone, replaced, bench };
}
