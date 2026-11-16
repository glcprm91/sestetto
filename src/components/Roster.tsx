import { useEffect, useState, type Dispatch } from 'react';
import { ROLE_META, ROSTER_ORDER, type PlayerId, type Team } from '../domain/types';
import type { Action, Settings } from '../state/store';
import { GENDER_COLORS, ROLE_COLORS, SETTER_RING } from '../theme';
import { Switch } from './Controls';

interface RosterProps {
  team: Team;
  teamCount: number;
  settings: Settings;
  dispatch: Dispatch<Action>;
}

function RoleBadge({ team, id, settings }: { team: Team; id: PlayerId; settings: Settings }) {
  const byGender = settings.colorMode === 'genere';
  const style = byGender ? GENDER_COLORS[team.players[id].gender] : ROLE_COLORS[ROLE_META[id].family];
  const ring = byGender && id === 'P' ? SETTER_RING : style.ring;
  return (
    <span
      className={`role-badge${id === 'L' ? ' role-badge--libero' : ''}`}
      style={{ background: style.fill, color: style.text, boxShadow: `0 0 0 2px ${ring}` }}
      title={ROLE_META[id].label}
    >
      {ROLE_META[id].code}
    </span>
  );
}

export function Roster({ team, teamCount, settings, dispatch }: RosterProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  useEffect(() => setConfirmDelete(false), [team.id]);

  return (
    <section className="section" aria-labelledby="roster-title">
      <h2 id="roster-title">Squadra</h2>

      <label className="field">
        <span className="field__label">Nome della squadra</span>
        <input
          className="input"
          value={team.name}
          maxLength={40}
          onChange={(event) => dispatch({ type: 'team/patch', patch: { name: event.target.value } })}
        />
      </label>

      <ul className="roster">
        {ROSTER_ORDER.map((id) => {
          const info = team.players[id];
          return (
            <li key={id} className="roster__row">
              <RoleBadge team={team} id={id} settings={settings} />
              <input
                className="input"
                value={info.name}
                maxLength={24}
                placeholder={ROLE_META[id].label}
                aria-label={`Nome, ${ROLE_META[id].label}`}
                autoComplete="off"
                onChange={(event) => dispatch({ type: 'player/patch', id, patch: { name: event.target.value } })}
              />
              <input
                className="input input--number"
                value={info.number}
                maxLength={3}
                inputMode="numeric"
                placeholder="N°"
                aria-label={`Numero di maglia, ${ROLE_META[id].label}`}
                autoComplete="off"
                onChange={(event) => dispatch({ type: 'player/patch', id, patch: { number: event.target.value.replace(/\D/g, '') } })}
              />
              {settings.colorMode === 'genere' && (
                <div className="gender" role="group" aria-label={`Genere, ${ROLE_META[id].label}`}>
                  {(['M', 'F'] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      aria-pressed={info.gender === gender}
                      style={info.gender === gender ? { background: GENDER_COLORS[gender].fill, color: '#fff' } : undefined}
                      onClick={() => dispatch({ type: 'player/patch', id, patch: { gender } })}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="note">S1 e C1 sono lo schiacciatore e il centrale accanto al palleggiatore nell'ordine di rotazione.</p>

      <Switch
        label="Il libero entra per il centrale di seconda linea"
        checked={team.useLibero}
        onChange={(useLibero) => dispatch({ type: 'team/patch', patch: { useLibero } })}
      />

      <div className="row">
        <button type="button" className="btn" onClick={() => dispatch({ type: 'team/add' })}>
          Nuova squadra
        </button>
        <button
          type="button"
          className={`btn${confirmDelete ? ' btn--danger' : ''}`}
          disabled={teamCount <= 1}
          onClick={() => {
            if (confirmDelete) {
              dispatch({ type: 'team/delete' });
              setConfirmDelete(false);
            } else setConfirmDelete(true);
          }}
        >
          {confirmDelete ? `Elimina davvero ${team.name || 'la squadra'}` : 'Elimina squadra'}
        </button>
      </div>
    </section>
  );
}
