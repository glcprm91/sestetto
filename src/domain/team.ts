import { ROLE_META, ROSTER_ORDER, type Gender, type PlayerId, type PlayerInfo, type Point, type Positions, type Team } from './types';

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function createTeam(name = 'La mia squadra'): Team {
  const players = {} as Record<PlayerId, PlayerInfo>;
  for (const id of ROSTER_ORDER) players[id] = { name: '', number: '', gender: 'M' };
  return { id: newId(), name, players, useLibero: true, defenseSystem: 'arretrato', custom: {}, notes: {} };
}

/** Nome da mostrare: quello scritto dall'utente, altrimenti la sigla del ruolo. */
export function displayName(team: Team, id: PlayerId): string {
  return team.players[id].name.trim() || ROLE_META[id].code;
}

/** Limiti entro cui un giocatore può essere trascinato (un po' oltre le linee, per chi batte). */
export const FIELD_LIMITS = { minX: -0.4, maxX: 9.4, minY: 0.45, maxY: 10.15 };

export function clampPoint(point: Point): Point {
  const round = (n: number) => Math.round(n * 20) / 20;
  return {
    x: round(Math.min(FIELD_LIMITS.maxX, Math.max(FIELD_LIMITS.minX, point.x))),
    y: round(Math.min(FIELD_LIMITS.maxY, Math.max(FIELD_LIMITS.minY, point.y))),
  };
}

const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '');

/**
 * Ricostruisce una squadra da dati non fidati (memoria del browser o link
 * condiviso), scartando tutto ciò che non ha la forma attesa.
 */
export function sanitizeTeam(input: unknown): Team | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const team = createTeam(text(raw.name, 40).trim() || 'Squadra');
  if (typeof raw.id === 'string' && /^[\w-]{1,64}$/.test(raw.id)) team.id = raw.id;
  team.useLibero = raw.useLibero !== false;
  team.defenseSystem = raw.defenseSystem === 'avanzato' ? 'avanzato' : 'arretrato';

  const players = (raw.players ?? {}) as Record<string, unknown>;
  for (const id of ROSTER_ORDER) {
    const info = (players[id] ?? {}) as Record<string, unknown>;
    const gender: Gender = info.gender === 'F' ? 'F' : 'M';
    team.players[id] = { name: text(info.name, 24), number: text(info.number, 3), gender };
  }

  const custom = (raw.custom ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(custom).slice(0, 200)) {
    if (!/^[\w/-]{1,60}$/.test(key)) continue;
    const scene = custom[key];
    if (!scene || typeof scene !== 'object') continue;
    const positions: Positions = {};
    for (const id of ROSTER_ORDER) {
      const point = (scene as Record<string, unknown>)[id] as Partial<Point> | undefined;
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
        positions[id] = clampPoint({ x: point.x as number, y: point.y as number });
      }
    }
    if (Object.keys(positions).length > 0) team.custom[key] = positions;
  }

  const notes = (raw.notes ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(notes).slice(0, 24)) {
    if (!/^(ricezione|battuta)\/[1-6]$/.test(key)) continue;
    const note = text(notes[key], 400);
    if (note.trim()) team.notes[key] = note;
  }
  return team;
}
