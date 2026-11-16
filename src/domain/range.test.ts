import { describe, expect, it } from 'vitest';
import { checkPositions } from './faults';
import { defaultPositions, defenseRoles, sceneKey } from './formations';
import { zoneOf } from './lineup';
import { clampRadius, clampToRange, isInRange, moveRange, RADIUS_LIMITS, type MoveRange } from './range';
import { buildScene, previousContext } from './scene';
import { createTeam } from './team';
import { PHASES, type PlayerId, type Rotation, type SceneContext, type Situation } from './types';

const ROTATIONS: Rotation[] = [1, 2, 3, 4, 5, 6];
const SITUATIONS: Situation[] = ['ricezione', 'battuta'];
const scene = (ctx: Partial<SceneContext>, team = createTeam()) =>
  buildScene(team, { situation: 'ricezione', rotation: 1, phase: 'ricezione', attackFrom: 'attesa', ...ctx });

describe('momenti nuovi', () => {
  it('il contrattacco chiude la sequenza, dopo la difesa', () => {
    expect(PHASES.ricezione).toEqual(['base', 'ricezione', 'attacco', 'difesa', 'contrattacco']);
    expect(PHASES.battuta).toEqual(['base', 'battuta', 'difesa', 'contrattacco']);
  });

  it('il contrattacco parte da dove si era in difesa, la free ball dalla difesa in attesa', () => {
    const contr: SceneContext = { situation: 'battuta', rotation: 3, phase: 'contrattacco', attackFrom: 'da4' };
    expect(previousContext(contr)).toEqual({ ...contr, phase: 'difesa' });
    const free: SceneContext = { situation: 'battuta', rotation: 3, phase: 'difesa', attackFrom: 'freeball' };
    expect(previousContext(free)).toEqual({ ...free, attackFrom: 'attesa' });
    expect(scene({ ...contr, attackFrom: 'freeball' }).previous).toEqual(scene(free).positions);
  });

  it('sulla free ball il palleggiatore è in zona di alzata e chi era a muro si stacca dalla rete', () => {
    for (const rotation of ROTATIONS) {
      const positions = defaultPositions({ situation: 'battuta', rotation, phase: 'difesa', attackFrom: 'freeball' }, 'arretrato', false);
      const roles = defenseRoles(rotation);
      expect(positions.P).toEqual({ x: 6.2, y: 0.7 });
      expect(positions[roles.SA]!.y).toBeGreaterThan(3);
      expect(positions[roles.CA]!.y).toBeGreaterThan(2);
      if (roles.DA !== 'P') expect(positions[roles.DA]!.y).toBeGreaterThan(3);
    }
  });

  it('in contrattacco a rete attaccano solo giocatori di prima linea', () => {
    for (const rotation of ROTATIONS) {
      const positions = defaultPositions({ situation: 'battuta', rotation, phase: 'contrattacco', attackFrom: 'attesa' }, 'arretrato', false);
      for (const role of Object.keys(positions) as PlayerId[]) {
        if (role === 'P' || role === 'L') continue;
        const front = [2, 3, 4].includes(zoneOf(role, rotation));
        expect(positions[role]!.y < 3, `P${rotation} ${role}`).toBe(front);
      }
    }
  });

  it('le posizioni spostate sulla free ball non dipendono dal sistema di difesa', () => {
    const free: SceneContext = { situation: 'battuta', rotation: 1, phase: 'difesa', attackFrom: 'freeball' };
    expect(sceneKey(free, 'arretrato')).toBe(sceneKey(free, 'avanzato'));
    expect(sceneKey({ ...free, attackFrom: 'da4' }, 'arretrato')).not.toBe(sceneKey({ ...free, attackFrom: 'da4' }, 'avanzato'));
    expect(sceneKey({ ...free, phase: 'contrattacco' }, 'arretrato')).toBe(sceneKey({ ...free, phase: 'contrattacco', attackFrom: 'da2' }, 'avanzato'));
  });
});

describe('range del giocatore', () => {
  const corners = (range: Extract<MoveRange, { kind: 'area' }>) => [
    { x: range.minX, y: range.minY },
    { x: range.maxX, y: range.minY },
    { x: range.minX, y: range.maxY },
    { x: range.maxX, y: range.maxY },
  ];

  it('al momento della battuta è un’area: in ogni suo punto il giocatore non fa fallo', () => {
    for (const useLibero of [true, false])
      for (const situation of SITUATIONS)
        for (const rotation of ROTATIONS)
          for (const phase of ['base', situation] as const) {
            const team = createTeam();
            team.useLibero = useLibero;
            const current = buildScene(team, { situation, rotation, phase, attackFrom: 'attesa' });
            for (const id of Object.keys(current.positions) as PlayerId[]) {
              const range = moveRange(current, id, 3);
              const label = `P${rotation} ${situation} ${phase} ${id}`;
              if (range.kind !== 'area') throw new Error(`${label}: atteso un range ad area`);
              expect(isInRange(current.positions[id]!, range), `${label}: lo schema sta nel range`).toBe(true);
              expect(range.maxX - range.minX, label).toBeGreaterThan(0.3);
              expect(range.maxY - range.minY, label).toBeGreaterThan(0.3);
              // Agli angoli estremi, e dopo l'arrotondamento alla griglia, non nasce nessun fallo.
              for (const corner of [...corners(range), { x: -5, y: -5 }, { x: 20, y: 20 }]) {
                const moved = clampToRange(corner, range);
                const faults = checkPositions(current.court.byZone, { ...current.positions, [id]: moved }, { serverExempt: phase === 'battuta' });
                expect(faults.filter((check) => !check.ok), `${label} in ${JSON.stringify(moved)}`).toEqual([]);
              }
            }
          }
  });

  it('chi batte può stare ovunque dietro la linea di fondo', () => {
    const current = scene({ situation: 'battuta', phase: 'battuta', rotation: 1 });
    const range = moveRange(current, 'P', 3);
    expect(range).toMatchObject({ kind: 'area', reason: 'servizio' });
    expect(clampToRange({ x: 1, y: 5 }, range)).toEqual({ x: 1, y: 9.5 });
  });

  it('l’area segue i compagni: se si sposta il vicino, il limite si sposta con lui', () => {
    // In P1 base il libero (posto 6) deve restare a sinistra del palleggiatore (posto 1).
    const team = createTeam();
    const ctx: SceneContext = { situation: 'ricezione', rotation: 1, phase: 'base', attackFrom: 'attesa' };
    const before = moveRange(buildScene(team, ctx), 'L', 3);
    team.custom[sceneKey(ctx, team.defenseSystem)] = { P: { x: 6, y: 6.3 } };
    const after = moveRange(buildScene(team, ctx), 'L', 3);
    if (before.kind !== 'area' || after.kind !== 'area') throw new Error('atteso un range ad area');
    expect(before.maxX).toBeCloseTo(7.4);
    expect(after.maxX).toBeCloseTo(5.9);
  });

  it('a palla in gioco è un cerchio attorno alla posizione dello schema', () => {
    for (const ctx of [
      { phase: 'attacco' },
      { phase: 'difesa', attackFrom: 'da4' },
      { phase: 'difesa', attackFrom: 'freeball' },
      { phase: 'contrattacco' },
    ] as Partial<SceneContext>[]) {
      const current = scene(ctx);
      for (const id of Object.keys(current.positions) as PlayerId[]) {
        const range = moveRange(current, id, 2.5);
        expect(range).toEqual({ kind: 'cerchio', center: current.defaults[id], radius: 2.5 });
        const far = clampToRange({ x: 30, y: 30 }, range);
        expect(isInRange(far, range)).toBe(true);
        expect(far.x).toBeLessThanOrEqual(9.4);
        expect(far.y).toBeLessThanOrEqual(10.15);
        expect(clampToRange(current.defaults[id]!, range)).toEqual(current.defaults[id]);
      }
    }
  });

  it('il cerchio resta centrato sullo schema anche dopo uno spostamento', () => {
    const team = createTeam();
    const ctx: SceneContext = { situation: 'ricezione', rotation: 1, phase: 'contrattacco', attackFrom: 'attesa' };
    const original = buildScene(team, ctx).defaults.S1!;
    team.custom[sceneKey(ctx, team.defenseSystem)] = { S1: { x: original.x + 2, y: original.y + 1 } };
    expect(moveRange(buildScene(team, ctx), 'S1', 3)).toEqual({ kind: 'cerchio', center: original, radius: 3 });
  });

  it('se i compagni sono già in fallo tra loro il giocatore resta libero, per poter sistemare', () => {
    const team = createTeam();
    const ctx: SceneContext = { situation: 'ricezione', rotation: 1, phase: 'base', attackFrom: 'attesa' };
    // S2 (posto 5) portato a destra del palleggiatore (posto 1): per il libero (posto 6) non c'è più spazio regolare.
    team.custom[sceneKey(ctx, team.defenseSystem)] = { S2: { x: 8.5, y: 6.3 } };
    expect(moveRange(buildScene(team, ctx), 'L', 3)).toEqual({ kind: 'libero' });
  });

  it('il raggio resta tra 1 e 6 metri, a passi di mezzo metro', () => {
    expect(clampRadius(0)).toBe(RADIUS_LIMITS.min);
    expect(clampRadius(99)).toBe(RADIUS_LIMITS.max);
    expect(clampRadius(2.7)).toBe(2.5);
    expect(clampRadius(Number.NaN)).toBe(RADIUS_LIMITS.initial);
  });
});
