import { describe, expect, it } from 'vitest';
import { attackRoles, defaultPositions, defenseRoles, sceneKey, scenePositions } from './formations';
import { sceneHint } from './hints';
import { lineup, liberoReplaces, nextRotation, onCourt, prevRotation, ROTATION_ORDER, zoneOf } from './lineup';
import { buildScene } from './scene';
import { createTeam, sanitizeTeam } from './team';
import { PHASES, type AttackFrom, type DefenseSystem, type PlayerId, type Rotation, type SceneContext, type Situation } from './types';
import { decodeTeam, encodeTeam } from '../state/share';

const ROTATIONS: Rotation[] = [1, 2, 3, 4, 5, 6];
const SITUATIONS: Situation[] = ['ricezione', 'battuta'];
const ATTACKS: AttackFrom[] = ['attesa', 'da4', 'da3', 'da2'];
const SYSTEMS: DefenseSystem[] = ['arretrato', 'avanzato'];

function allContexts(): SceneContext[] {
  const contexts: SceneContext[] = [];
  for (const situation of SITUATIONS)
    for (const rotation of ROTATIONS)
      for (const phase of PHASES[situation])
        for (const attackFrom of phase === 'difesa' ? ATTACKS : (['attesa'] as AttackFrom[]))
          contexts.push({ situation, rotation, phase, attackFrom });
  return contexts;
}

describe('rotazioni', () => {
  it('P1 è la formazione di partenza del 5-1', () => {
    expect(lineup(1)).toEqual({ 1: 'P', 2: 'S1', 3: 'C2', 4: 'O', 5: 'S2', 6: 'C1' });
  });

  it('le altre rotazioni seguono il giro in senso orario', () => {
    expect(lineup(6)).toEqual({ 6: 'P', 1: 'S1', 2: 'C2', 3: 'O', 4: 'S2', 5: 'C1' });
    expect(lineup(5)).toEqual({ 5: 'P', 6: 'S1', 1: 'C2', 2: 'O', 3: 'S2', 4: 'C1' });
    expect(lineup(4)).toEqual({ 4: 'P', 5: 'S1', 6: 'C2', 1: 'O', 2: 'S2', 3: 'C1' });
    expect(lineup(3)).toEqual({ 3: 'P', 4: 'S1', 5: 'C2', 6: 'O', 1: 'S2', 2: 'C1' });
    expect(lineup(2)).toEqual({ 2: 'P', 3: 'S1', 4: 'C2', 5: 'O', 6: 'S2', 1: 'C1' });
  });

  it('il nome della rotazione è la zona del palleggiatore', () => {
    for (const rotation of ROTATIONS) expect(zoneOf('P', rotation)).toBe(rotation);
  });

  it('palleggiatore e opposto, e le coppie di schiacciatori e centrali, sono sempre in diagonale', () => {
    const opposite = (a: number, b: number) => Math.abs(a - b) === 3;
    for (const rotation of ROTATIONS) {
      expect(opposite(zoneOf('P', rotation), zoneOf('O', rotation))).toBe(true);
      expect(opposite(zoneOf('S1', rotation), zoneOf('S2', rotation))).toBe(true);
      expect(opposite(zoneOf('C1', rotation), zoneOf('C2', rotation))).toBe(true);
    }
  });

  it('si ruota P1 → P6 → P5 → P4 → P3 → P2 → P1', () => {
    expect(ROTATION_ORDER).toEqual([1, 6, 5, 4, 3, 2]);
    expect(nextRotation(1)).toBe(6);
    expect(nextRotation(2)).toBe(1);
    expect(prevRotation(1)).toBe(2);
    for (const rotation of ROTATIONS) expect(prevRotation(nextRotation(rotation))).toBe(rotation);
  });
});

describe('libero', () => {
  it('in ricezione sostituisce sempre il centrale di seconda linea', () => {
    expect(ROTATIONS.map((r) => liberoReplaces(r, 'ricezione', true))).toEqual(['C1', 'C1', 'C2', 'C2', 'C2', 'C1']);
  });

  it('in battuta resta fuori quando il centrale è al servizio (P5 e P2)', () => {
    expect(liberoReplaces(5, 'battuta', true)).toBeNull();
    expect(liberoReplaces(2, 'battuta', true)).toBeNull();
    expect(liberoReplaces(1, 'battuta', true)).toBe('C1');
    expect(liberoReplaces(4, 'battuta', true)).toBe('C2');
  });

  it('non entra se la squadra non lo usa', () => {
    for (const rotation of ROTATIONS) expect(liberoReplaces(rotation, 'ricezione', false)).toBeNull();
  });

  it('in campo ci sono sempre sei giocatori, e il libero solo in seconda linea', () => {
    for (const situation of SITUATIONS)
      for (const rotation of ROTATIONS) {
        const court = onCourt(rotation, situation, true);
        expect(Object.keys(court.zones)).toHaveLength(6);
        if (court.zones.L) expect([1, 5, 6]).toContain(court.zones.L);
      }
  });
});

describe('formazioni', () => {
  it('ogni scena posiziona esattamente i sei giocatori in campo', () => {
    for (const useLibero of [true, false])
      for (const system of SYSTEMS)
        for (const ctx of allContexts()) {
          const court = onCourt(ctx.rotation, ctx.situation, useLibero);
          const positions = defaultPositions(ctx, system, useLibero);
          expect(Object.keys(positions).sort(), JSON.stringify(ctx)).toEqual(Object.keys(court.zones).sort());
        }
  });

  it('base, ricezione e battuta non hanno falli di posizione', () => {
    for (const useLibero of [true, false]) {
      const team = createTeam();
      team.useLibero = useLibero;
      for (const ctx of allContexts()) {
        const scene = buildScene(team, ctx);
        if (ctx.phase === 'attacco' || ctx.phase === 'difesa') {
          expect(scene.checks).toBeNull();
          continue;
        }
        const faults = scene.checks!.filter((check) => !check.ok);
        expect(faults, `P${ctx.rotation} ${ctx.situation} ${ctx.phase}`).toEqual([]);
        expect(scene.checks!.length).toBe(ctx.phase === 'battuta' ? 5 : 7);
      }
    }
  });

  it('nessuno si sovrappone a un compagno', () => {
    for (const system of SYSTEMS)
      for (const ctx of allContexts()) {
        const points = Object.values(defaultPositions(ctx, system, true));
        for (let i = 0; i < points.length; i++)
          for (let j = i + 1; j < points.length; j++) {
            const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            expect(distance, `${JSON.stringify(ctx)} ${system}`).toBeGreaterThanOrEqual(0.95);
          }
      }
  });

  it('in ricezione i tre ricevitori sono i due schiacciatori e il libero, dietro i tre metri', () => {
    for (const rotation of ROTATIONS) {
      const positions = defaultPositions({ situation: 'ricezione', rotation, phase: 'ricezione', attackFrom: 'attesa' }, 'arretrato', true);
      for (const id of ['S1', 'S2', 'L'] as PlayerId[]) expect(positions[id]!.y).toBeGreaterThan(5);
      expect(positions.P!.y).toBeLessThan(rotation === 1 ? 7 : 3);
    }
  });

  it('in attacco gli attaccanti a rete sono di prima linea', () => {
    for (const rotation of ROTATIONS) {
      const roles = attackRoles(rotation);
      for (const slot of ['posto4', 'centro', 'posto2'] as const) {
        const role = roles[slot];
        if (role) expect([2, 3, 4], `P${rotation} ${slot}`).toContain(zoneOf(role, rotation));
      }
      for (const slot of ['pipe', 'secondaLinea'] as const) {
        const role = roles[slot];
        if (role) expect([1, 5, 6], `P${rotation} ${slot}`).toContain(zoneOf(role, rotation));
      }
      expect(Object.values(roles)).toHaveLength(6);
      expect(Boolean(roles.posto2)).toBe([1, 5, 6].includes(rotation));
    }
  });

  it('in difesa chi mura è di prima linea e chi difende è di seconda', () => {
    for (const rotation of ROTATIONS) {
      const roles = defenseRoles(rotation);
      for (const slot of ['SA', 'CA', 'DA'] as const) expect([2, 3, 4]).toContain(zoneOf(roles[slot], rotation));
      for (const slot of ['SD', 'CD', 'DD'] as const) expect([1, 5, 6]).toContain(zoneOf(roles[slot], rotation));
      expect(new Set(Object.values(roles)).size).toBe(6);
    }
  });

  it('la difesa su attacco da posto 2 è lo specchio di quella da posto 4', () => {
    for (const system of SYSTEMS) {
      const da4 = defaultPositions({ situation: 'battuta', rotation: 1, phase: 'difesa', attackFrom: 'da4' }, system, true);
      const da2 = defaultPositions({ situation: 'battuta', rotation: 1, phase: 'difesa', attackFrom: 'da2' }, system, true);
      const xs = (positions: typeof da4) => Object.values(positions).map((pt) => pt.x).sort((a, b) => a - b);
      const mirrored = xs(da4).map((x) => Math.round((9 - x) * 10) / 10).sort((a, b) => a - b);
      expect(xs(da2)).toEqual(mirrored);
    }
  });
});

describe('personalizzazione', () => {
  const ctx: SceneContext = { situation: 'ricezione', rotation: 4, phase: 'ricezione', attackFrom: 'attesa' };

  it('una posizione spostata a mano vale solo per la sua scena', () => {
    const team = createTeam();
    team.custom[sceneKey(ctx, team.defenseSystem)] = { O: { x: 5, y: 8 } };
    expect(scenePositions(team, ctx).O).toEqual({ x: 5, y: 8 });
    expect(scenePositions(team, { ...ctx, rotation: 3 }).O).not.toEqual({ x: 5, y: 8 });
  });

  it('uno spostamento irregolare viene segnalato come fallo', () => {
    const team = createTeam();
    // In P4 l'opposto (posto 1) davanti a S2 (posto 2) è fallo.
    team.custom[sceneKey(ctx, team.defenseSystem)] = { O: { x: 8.2, y: 3 } };
    const faults = buildScene(team, ctx).checks!.filter((check) => !check.ok);
    expect(faults).toEqual([{ a: 'S2', b: 'O', kind: 'rete', ok: false }]);
  });

  it('le spiegazioni usano i nomi della squadra', () => {
    const team = createTeam();
    team.players.P.name = 'Matteo';
    team.players.L.name = 'Teresa';
    const hint = sceneHint(team, { situation: 'ricezione', rotation: 1, phase: 'ricezione', attackFrom: 'attesa' });
    expect(hint).toContain('Ricevono S2, Teresa e S1.');
    expect(hint).toContain('Matteo parte dietro S1');
  });

  it('ogni scena ha una spiegazione', () => {
    for (const system of SYSTEMS) {
      const team = createTeam();
      team.defenseSystem = system;
      for (const context of allContexts()) expect(sceneHint(team, context).length).toBeGreaterThan(20);
    }
  });
});

describe('condivisione', () => {
  it('una squadra passa intera dal link', () => {
    const team = createTeam('Volley Ortona');
    team.players.P = { name: 'Niccolò', number: '7', gender: 'M' };
    team.players.L = { name: 'Teresa', number: '1', gender: 'F' };
    team.defenseSystem = 'avanzato';
    team.custom['ricezione/ricezione/-/4'] = { O: { x: 5, y: 8 } };
    team.notes['ricezione/4'] = 'Attenzione alla battuta corta';
    const copy = decodeTeam(encodeTeam(team))!;
    expect(copy.id).not.toBe(team.id);
    expect({ ...copy, id: team.id }).toEqual(team);
  });

  it('dati non validi vengono scartati o ripuliti', () => {
    expect(decodeTeam('non-valido!!')).toBeNull();
    expect(sanitizeTeam(null)).toBeNull();
    const team = sanitizeTeam({
      name: 'x'.repeat(100),
      players: { P: { name: 'y'.repeat(100), number: '12345', gender: 'boh' } },
      custom: { 'chiave strana <script>': { P: { x: 1, y: 1 } }, 'ricezione/base/-/1': { P: { x: 999, y: 'a' }, O: { x: 99, y: -5 } } },
      notes: { altro: 'no', 'battuta/3': 'ok' },
    })!;
    expect(team.name).toHaveLength(40);
    expect(team.players.P).toEqual({ name: 'y'.repeat(24), number: '123', gender: 'M' });
    expect(team.custom).toEqual({ 'ricezione/base/-/1': { O: { x: 9.4, y: 0.45 } } });
    expect(team.notes).toEqual({ 'battuta/3': 'ok' });
  });
});
