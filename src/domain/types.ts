/** I sei giocatori di base del sistema 5-1, più il libero. */
export type RoleId = 'P' | 'S1' | 'C2' | 'O' | 'S2' | 'C1';
export type PlayerId = RoleId | 'L';

/** Zone del campo: 4 3 2 a rete (da sinistra), 5 6 1 in seconda linea. */
export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

/** Una rotazione si chiama con la zona del palleggiatore: P1 … P6. */
export type Rotation = Zone;

/**
 * Coordinate in metri sulla propria metà campo (9 × 9):
 * x da 0 (linea laterale sinistra) a 9, y da 0 (rete) a 9 (linea di fondo).
 * La battuta parte oltre y = 9.
 */
export interface Point {
  x: number;
  y: number;
}

export type Situation = 'ricezione' | 'battuta';
export type PhaseId = 'base' | 'ricezione' | 'attacco' | 'battuta' | 'difesa';
export type AttackFrom = 'attesa' | 'da4' | 'da3' | 'da2';
export type DefenseSystem = 'arretrato' | 'avanzato';

export type Gender = 'M' | 'F';

export interface PlayerInfo {
  name: string;
  number: string;
  gender: Gender;
}

export type Positions = Partial<Record<PlayerId, Point>>;

export interface Team {
  id: string;
  name: string;
  players: Record<PlayerId, PlayerInfo>;
  /** Il libero entra per il centrale di seconda linea. */
  useLibero: boolean;
  defenseSystem: DefenseSystem;
  /** Posizioni spostate a mano, per chiave di scena (vedi sceneKey). */
  custom: Record<string, Positions>;
  /** Note libere, per situazione e rotazione. */
  notes: Record<string, string>;
}

export interface SceneContext {
  rotation: Rotation;
  situation: Situation;
  phase: PhaseId;
  attackFrom: AttackFrom;
}

export const ROLE_META: Record<PlayerId, { code: string; label: string; family: 'P' | 'S' | 'C' | 'O' | 'L' }> = {
  P: { code: 'P', label: 'Palleggiatore', family: 'P' },
  S1: { code: 'S1', label: 'Schiacciatore 1', family: 'S' },
  C1: { code: 'C1', label: 'Centrale 1', family: 'C' },
  O: { code: 'O', label: 'Opposto', family: 'O' },
  S2: { code: 'S2', label: 'Schiacciatore 2', family: 'S' },
  C2: { code: 'C2', label: 'Centrale 2', family: 'C' },
  L: { code: 'L', label: 'Libero', family: 'L' },
};

/** Ordine con cui la rosa viene mostrata. */
export const ROSTER_ORDER: PlayerId[] = ['P', 'S1', 'C1', 'O', 'S2', 'C2', 'L'];

export const PHASES: Record<Situation, PhaseId[]> = {
  ricezione: ['base', 'ricezione', 'attacco', 'difesa'],
  battuta: ['base', 'battuta', 'difesa'],
};

export const PHASE_LABEL: Record<PhaseId, string> = {
  base: 'Base',
  ricezione: 'Ricezione',
  attacco: 'Attacco',
  battuta: 'Battuta',
  difesa: 'Difesa',
};

export const SITUATION_LABEL: Record<Situation, string> = {
  ricezione: 'In ricezione',
  battuta: 'In battuta',
};

export const ATTACK_LABEL: Record<AttackFrom, string> = {
  attesa: 'In attesa',
  da4: 'Posto 4',
  da3: 'Centro',
  da2: 'Posto 2',
};
