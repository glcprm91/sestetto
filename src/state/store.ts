import { clampRadius, RADIUS_LIMITS } from '../domain/range';
import { clampPoint, createTeam, sanitizeTeam } from '../domain/team';
import type { PlayerId, PlayerInfo, Point, Team } from '../domain/types';

export interface Settings {
  /** Colore dei giocatori: per ruolo, oppure per genere (utile nel misto). */
  colorMode: 'ruolo' | 'genere';
  /** Cosa si legge dentro il segnaposto. */
  badge: 'ruolo' | 'numero';
  showArrows: boolean;
  showFaults: boolean;
  /** Il giocatore selezionato si sposta solo dentro il suo range. */
  limitMoves: boolean;
  /** Raggio di spostamento a palla in gioco, in metri. */
  moveRadius: number;
}

export interface AppState {
  teams: Team[];
  activeId: string;
  settings: Settings;
}

export type Action =
  | { type: 'team/select'; id: string }
  | { type: 'team/add' }
  | { type: 'team/import'; team: Team }
  | { type: 'team/delete' }
  | { type: 'team/patch'; patch: Partial<Pick<Team, 'name' | 'useLibero' | 'defenseSystem'>> }
  | { type: 'player/patch'; id: PlayerId; patch: Partial<PlayerInfo> }
  | { type: 'custom/move'; key: string; id: PlayerId; point: Point }
  | { type: 'custom/reset'; key: string }
  | { type: 'custom/resetPlayer'; key: string; id: PlayerId }
  | { type: 'custom/resetAll' }
  | { type: 'note/set'; key: string; text: string }
  | { type: 'settings/patch'; patch: Partial<Settings> };

const STORAGE_KEY = 'sestetto:v1';

const DEFAULT_SETTINGS: Settings = {
  colorMode: 'ruolo',
  badge: 'ruolo',
  showArrows: false,
  showFaults: false,
  limitMoves: true,
  moveRadius: RADIUS_LIMITS.initial,
};

export function initialState(): AppState {
  const team = createTeam();
  return { teams: [team], activeId: team.id, settings: DEFAULT_SETTINGS };
}

/** Rilegge le squadre salvate nel browser; se manca qualcosa riparte da una squadra vuota. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const teams = (Array.isArray(parsed.teams) ? parsed.teams : [])
      .map(sanitizeTeam)
      .filter((team): team is Team => team !== null)
      .slice(0, 30);
    if (teams.length === 0) return initialState();
    const saved = (parsed.settings ?? {}) as Partial<Settings>;
    return {
      teams,
      activeId: teams.some((team) => team.id === parsed.activeId) ? (parsed.activeId as string) : teams[0].id,
      settings: {
        colorMode: saved.colorMode === 'genere' ? 'genere' : 'ruolo',
        badge: saved.badge === 'numero' ? 'numero' : 'ruolo',
        showArrows: saved.showArrows === true,
        showFaults: saved.showFaults === true,
        limitMoves: saved.limitMoves !== false,
        moveRadius: clampRadius(typeof saved.moveRadius === 'number' ? saved.moveRadius : RADIUS_LIMITS.initial),
      },
    };
  } catch {
    return initialState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Memoria non disponibile (navigazione privata, spazio esaurito): si continua senza salvare.
  }
}

export function activeTeam(state: AppState): Team {
  return state.teams.find((team) => team.id === state.activeId) ?? state.teams[0];
}

function updateActive(state: AppState, update: (team: Team) => Team): AppState {
  const current = activeTeam(state);
  return { ...state, teams: state.teams.map((team) => (team.id === current.id ? update(team) : team)) };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'team/select':
      return state.teams.some((team) => team.id === action.id) ? { ...state, activeId: action.id } : state;

    case 'team/add': {
      const team = createTeam(`Squadra ${state.teams.length + 1}`);
      return { ...state, teams: [...state.teams, team], activeId: team.id };
    }

    case 'team/import':
      return { ...state, teams: [...state.teams, action.team], activeId: action.team.id };

    case 'team/delete': {
      if (state.teams.length <= 1) return state;
      const teams = state.teams.filter((team) => team.id !== state.activeId);
      return { ...state, teams, activeId: teams[0].id };
    }

    case 'team/patch':
      return updateActive(state, (team) => ({ ...team, ...action.patch }));

    case 'player/patch':
      return updateActive(state, (team) => ({
        ...team,
        players: { ...team.players, [action.id]: { ...team.players[action.id], ...action.patch } },
      }));

    case 'custom/move':
      return updateActive(state, (team) => ({
        ...team,
        custom: { ...team.custom, [action.key]: { ...team.custom[action.key], [action.id]: clampPoint(action.point) } },
      }));

    case 'custom/reset':
      return updateActive(state, (team) => {
        const { [action.key]: _removed, ...custom } = team.custom;
        return { ...team, custom };
      });

    case 'custom/resetPlayer':
      return updateActive(state, (team) => {
        const { [action.id]: _removed, ...rest } = team.custom[action.key] ?? {};
        const { [action.key]: _scene, ...others } = team.custom;
        return { ...team, custom: Object.keys(rest).length > 0 ? { ...others, [action.key]: rest } : others };
      });

    case 'custom/resetAll':
      return updateActive(state, (team) => ({ ...team, custom: {} }));

    case 'note/set':
      return updateActive(state, (team) => {
        const notes = { ...team.notes };
        if (action.text.trim()) notes[action.key] = action.text.slice(0, 400);
        else delete notes[action.key];
        return { ...team, notes };
      });

    case 'settings/patch': {
      const settings = { ...state.settings, ...action.patch };
      return { ...state, settings: { ...settings, moveRadius: clampRadius(settings.moveRadius) } };
    }
  }
}
