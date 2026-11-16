import { DEPTH_PAIRS, SIDE_PAIRS } from './faults';
import { positionRulesApply } from './formations';
import type { Scene } from './scene';
import { clampPoint, FIELD_LIMITS } from './team';
import type { PlayerId, Point, Zone } from './types';

/**
 * Fin dove si può spostare un giocatore selezionato.
 * - area: un rettangolo. Al momento della battuta è lo spazio in cui non
 *   commette fallo di posizione rispetto ai compagni vicini; per chi batte è
 *   la zona di servizio dietro la linea di fondo.
 * - cerchio: a palla in gioco, il raggio di spostamento attorno al punto in
 *   cui lo mette lo schema.
 * - libero: nessun limite, oltre ai bordi del campo.
 */
export type MoveRange =
  | { kind: 'area'; reason: 'posizione' | 'servizio'; minX: number; maxX: number; minY: number; maxY: number }
  | { kind: 'cerchio'; center: Point; radius: number }
  | { kind: 'libero' };

export const RADIUS_LIMITS = { min: 1, max: 6, step: 0.5, initial: 3 };

/** Dentro il campo, con un po' di margine dalle linee. */
const COURT_AREA = { minX: 0.25, maxX: 8.75, minY: FIELD_LIMITS.minY, maxY: 8.75 };

/** Zona di servizio: dietro la linea di fondo, per tutta la larghezza del campo. */
const SERVICE_AREA = { minX: 0.25, maxX: 8.75, minY: 9.5, maxY: FIELD_LIMITS.maxY };

/** Distanza minima dal compagno che fa da limite: più del margine usato nel controllo dei falli. */
const GAP = 0.1;

export function clampRadius(radius: number): number {
  const stepped = Math.round(radius / RADIUS_LIMITS.step) * RADIUS_LIMITS.step;
  return Math.min(RADIUS_LIMITS.max, Math.max(RADIUS_LIMITS.min, Number.isFinite(stepped) ? stepped : RADIUS_LIMITS.initial));
}

export function moveRange(scene: Scene, id: PlayerId, radius: number): MoveRange {
  const zone = scene.court.zones[id];
  if (!zone) return { kind: 'libero' };

  if (!positionRulesApply(scene.ctx)) {
    const center = scene.defaults[id];
    return center ? { kind: 'cerchio', center, radius: clampRadius(radius) } : { kind: 'libero' };
  }

  const serving = scene.ctx.phase === 'battuta';
  if (serving && zone === 1) return { kind: 'area', reason: 'servizio', ...SERVICE_AREA };

  // Chi batte non conta per i limiti dei compagni.
  const limit = (other: Zone): Point | null => (serving && other === 1 ? null : (scene.positions[scene.court.byZone[other]] ?? null));
  const area = { ...COURT_AREA };

  for (const [left, right] of SIDE_PAIRS) {
    if (zone === left) {
      const other = limit(right);
      if (other) area.maxX = Math.min(area.maxX, other.x - GAP);
    } else if (zone === right) {
      const other = limit(left);
      if (other) area.minX = Math.max(area.minX, other.x + GAP);
    }
  }
  for (const [front, back] of DEPTH_PAIRS) {
    if (zone === front) {
      const other = limit(back);
      if (other) area.maxY = Math.min(area.maxY, other.y - GAP);
    } else if (zone === back) {
      const other = limit(front);
      if (other) area.minY = Math.max(area.minY, other.y + GAP);
    }
  }

  // Se i compagni sono già in fallo tra loro non esiste uno spazio regolare: si lascia libero per poter sistemare.
  if (area.minX > area.maxX || area.minY > area.maxY) return { kind: 'libero' };
  return { kind: 'area', reason: 'posizione', ...area };
}

/** Riporta un punto dentro il range, e comunque dentro i bordi del campo. */
export function clampToRange(point: Point, range: MoveRange): Point {
  if (range.kind === 'area') {
    // Arrotondando verso l'interno il punto resta nell'area anche sulla griglia da 5 cm.
    const inward = (value: number, min: number, max: number) => {
      const clamped = Math.min(max, Math.max(min, value));
      const snapped = Math.round(clamped * 20) / 20;
      if (snapped < min) return Math.ceil(min * 20 - 1e-9) / 20;
      if (snapped > max) return Math.floor(max * 20 + 1e-9) / 20;
      return snapped;
    };
    return { x: inward(point.x, range.minX, range.maxX), y: inward(point.y, range.minY, range.maxY) };
  }
  if (range.kind === 'cerchio') {
    const dx = point.x - range.center.x;
    const dy = point.y - range.center.y;
    const distance = Math.hypot(dx, dy);
    const scale = distance > range.radius ? range.radius / distance : 1;
    return clampPoint({ x: range.center.x + dx * scale, y: range.center.y + dy * scale });
  }
  return clampPoint(point);
}

export function isInRange(point: Point, range: MoveRange): boolean {
  if (range.kind === 'area') {
    return point.x >= range.minX - 1e-6 && point.x <= range.maxX + 1e-6 && point.y >= range.minY - 1e-6 && point.y <= range.maxY + 1e-6;
  }
  if (range.kind === 'cerchio') return Math.hypot(point.x - range.center.x, point.y - range.center.y) <= range.radius + 0.04;
  return true;
}
