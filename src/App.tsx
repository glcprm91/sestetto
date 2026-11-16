import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { sceneCaption } from './captions';
import { DefenseOptions, PhaseBar, PlayButton, RotationBar, Segmented, SituationSwitch, Switch } from './components/Controls';
import { Court } from './components/Court';
import { Roster } from './components/Roster';
import { noteKey, sceneKey } from './domain/formations';
import { sceneHint } from './domain/hints';
import { nextRotation, prevRotation, ROTATION_ORDER } from './domain/lineup';
import { buildScene } from './domain/scene';
import { displayName } from './domain/team';
import { PHASES, type AttackFrom, type PhaseId, type PlayerId, type Point, type Rotation, type SceneContext, type Situation } from './domain/types';
import { downloadPng } from './export/png';
import { shareUrl, teamFromHash } from './state/share';
import { activeTeam, loadState, reducer, saveState } from './state/store';

const SITE_NAME = 'Sestetto';

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [rotation, setRotation] = useState<Rotation>(1);
  const [situation, setSituation] = useState<Situation>('ricezione');
  const [phase, setPhase] = useState<PhaseId>('ricezione');
  const [attackFrom, setAttackFrom] = useState<AttackFrom>('attesa');
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);

  const team = activeTeam(state);
  const { settings } = state;
  const ctx: SceneContext = useMemo(() => ({ rotation, situation, phase, attackFrom }), [rotation, situation, phase, attackFrom]);
  const scene = useMemo(() => buildScene(team, ctx), [team, ctx]);
  const key = sceneKey(ctx, team.defenseSystem);
  const courtSettings = useMemo(() => ({ ...settings, showFaults: settings.showFaults || editing }), [settings, editing]);

  useEffect(() => saveState(state), [state]);

  // Una squadra arrivata con un link condiviso viene aggiunta alle proprie.
  useEffect(() => {
    const shared = teamFromHash(window.location.hash);
    if (!shared) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    dispatch({ type: 'team/import', team: shared });
    setToast(`Squadra aggiunta: ${shared.name}`);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Scorrimento automatico: un momento dopo l'altro fino alla difesa.
  useEffect(() => {
    if (!playing) return;
    const phases = PHASES[situation];
    const index = phases.indexOf(phase);
    if (index >= phases.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setPhase(phases[index + 1]);
      setAttackFrom('attesa');
    }, 1600);
    return () => clearTimeout(timer);
  }, [playing, phase, situation]);

  const selectPhase = (next: PhaseId) => {
    setPlaying(false);
    setPhase(next);
    setAttackFrom('attesa');
  };

  const selectSituation = (next: Situation) => {
    setPlaying(false);
    setSituation(next);
    setAttackFrom('attesa');
    if (!PHASES[next].includes(phase)) setPhase(next);
  };

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    const phases = PHASES[situation];
    if (phases.indexOf(phase) >= phases.length - 1) setPhase(phases[0]);
    setAttackFrom('attesa');
    setShowAll(false);
    setPlaying(true);
  };

  /** Cambia cosa mostra il campo e lo riporta in vista: su telefono i comandi stanno più in basso. */
  const showOnStage = (...changes: (() => void)[]) => {
    setPlaying(false);
    for (const change of changes) change();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stageRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const movePlayer = useCallback(
    (id: PlayerId, point: Point) => dispatch({ type: 'custom/move', key, id, point }),
    [key],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(team, window.location.href));
      setToast('Link copiato: chi lo apre riceve la squadra');
    } catch {
      setToast('Non riesco a copiare il link da qui');
    }
  };

  const savePng = async () => {
    if (!svgRef.current) return;
    try {
      const slug = (team.name || 'squadra').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'squadra';
      await downloadPng(svgRef.current, `${slug}-p${rotation}-${phase}.png`);
    } catch {
      setToast('Non riesco a creare l’immagine');
    }
  };

  const faults = scene.checks?.filter((check) => !check.ok) ?? [];
  const faultText = (a: PlayerId, b: PlayerId, kind: 'lato' | 'rete') =>
    kind === 'lato'
      ? `${displayName(team, a)} deve stare a sinistra di ${displayName(team, b)}`
      : `${displayName(team, a)} deve stare più vicino alla rete di ${displayName(team, b)}`;
  const note = team.notes[noteKey(situation, rotation)] ?? '';
  const customCount = Object.keys(team.custom).length;

  return (
    <div className="app">
      <header className="top">
        <h1>{SITE_NAME}</h1>
        <label className="team-picker">
          <span className="visually-hidden">Squadra</span>
          <select value={team.id} onChange={(event) => dispatch({ type: 'team/select', id: event.target.value })}>
            {state.teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || 'Squadra senza nome'}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="board">
        <section className={`stage${showAll || editing ? ' stage--tall' : ''}`} aria-label="Campo" ref={stageRef}>
          {showAll ? (
            <div className="overview">
              {ROTATION_ORDER.map((value) => {
                const itemCtx = { ...ctx, rotation: value };
                return (
                  <button
                    key={value}
                    type="button"
                    className="overview__item"
                    aria-label={`Apri la rotazione P${value}`}
                    onClick={() => {
                      setRotation(value);
                      setShowAll(false);
                    }}
                  >
                    <Court team={team} scene={buildScene(team, itemCtx)} settings={settings} caption={sceneCaption(itemCtx)} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="court-wrap">
              <Court
                team={team}
                scene={scene}
                settings={courtSettings}
                caption={sceneCaption(ctx)}
                editable={editing}
                onMove={movePlayer}
                svgRef={svgRef}
              />
            </div>
          )}

          {!showAll && editing && (
            <div className="edit-bar">
              <p>Trascina i giocatori dove li vuoi. Vale per questa squadra, in questa rotazione e in questo momento.</p>
              <div className="row">
                <button type="button" className="btn" disabled={!scene.customized} onClick={() => dispatch({ type: 'custom/reset', key })}>
                  Ripristina lo schema
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setEditing(false)}>
                  Fatto
                </button>
              </div>
            </div>
          )}

          {!showAll && (settings.showFaults || faults.length > 0) && (
            <div className="status">
              {faults.length > 0 && (
                <ul className="faults" role="alert">
                  {faults.map((fault) => (
                    <li key={`${fault.a}-${fault.b}`}>Fallo di posizione: {faultText(fault.a, fault.b, fault.kind)}.</li>
                  ))}
                </ul>
              )}
              {scene.checks && faults.length === 0 && <p className="status__ok">Nessun fallo di posizione.</p>}
              {!scene.checks && <p>Dopo la battuta ci si muove liberamente: qui non ci sono falli di posizione.</p>}
            </div>
          )}
        </section>

        <div className="panel">
          <section className="section section--first" aria-label="Azione e rotazione">
            <div className="action-row">
              <SituationSwitch value={situation} onChange={selectSituation} />
              <PlayButton playing={playing} onToggle={togglePlay} />
            </div>
            <PhaseBar situation={situation} phase={phase} onSelect={selectPhase} />
            {phase === 'difesa' && (
              <DefenseOptions
                attackFrom={attackFrom}
                system={team.defenseSystem}
                onAttack={(value) => {
                  setPlaying(false);
                  setAttackFrom(value);
                }}
                onSystem={(defenseSystem) => dispatch({ type: 'team/patch', patch: { defenseSystem } })}
              />
            )}
            <RotationBar
              rotation={rotation}
              onSelect={setRotation}
              onNext={() => setRotation(nextRotation(rotation))}
              onPrev={() => setRotation(prevRotation(rotation))}
            />
          </section>

          <section className="section" aria-label="Spiegazione e strumenti">
            <p className="hint">{sceneHint(team, ctx)}</p>
            <div className="row">
              <button type="button" className="btn" aria-pressed={editing} onClick={() => showOnStage(() => setEditing(!editing), () => setShowAll(false))}>
                Sposta i giocatori
              </button>
              <button type="button" className="btn" aria-pressed={showAll} onClick={() => showOnStage(() => setShowAll(!showAll), () => setEditing(false))}>
                Tutte e sei le rotazioni
              </button>
            </div>
            <label className="field">
              <span className="field__label">
                Appunti per P{rotation} {situation === 'battuta' ? 'in battuta' : 'in ricezione'}
              </span>
              <textarea
                className="input"
                rows={2}
                maxLength={400}
                value={note}
                placeholder="Per esempio: attenzione alla battuta corta in posto 2"
                onChange={(event) => dispatch({ type: 'note/set', key: noteKey(situation, rotation), text: event.target.value })}
              />
            </label>
          </section>

          <Roster team={team} teamCount={state.teams.length} settings={settings} dispatch={dispatch} />

          <section className="section" aria-labelledby="view-title">
            <h2 id="view-title">Vista</h2>
            <Segmented
              label="Colori dei giocatori"
              value={settings.colorMode}
              onChange={(colorMode) => dispatch({ type: 'settings/patch', patch: { colorMode } })}
              options={[
                { value: 'ruolo', label: 'Per ruolo' },
                { value: 'genere', label: 'Maschi e femmine' },
              ]}
            />
            <Segmented
              label="Scritta sul giocatore"
              value={settings.badge}
              onChange={(badge) => dispatch({ type: 'settings/patch', patch: { badge } })}
              options={[
                { value: 'ruolo', label: 'Ruolo' },
                { value: 'numero', label: 'Numero di maglia' },
              ]}
            />
            <Switch label="Frecce degli spostamenti" checked={settings.showArrows} onChange={(showArrows) => dispatch({ type: 'settings/patch', patch: { showArrows } })} />
            <Switch label="Falli di posizione" checked={settings.showFaults} onChange={(showFaults) => dispatch({ type: 'settings/patch', patch: { showFaults } })} />

            <div className="row">
              <button type="button" className="btn" disabled={showAll} onClick={savePng}>
                Scarica immagine
              </button>
              <button type="button" className="btn" onClick={() => window.print()}>
                Stampa
              </button>
              <button type="button" className="btn" onClick={copyLink}>
                Copia link della squadra
              </button>
            </div>
            {customCount > 0 && (
              <button type="button" className="btn btn--quiet" onClick={() => dispatch({ type: 'custom/resetAll' })}>
                Ripristina tutte le posizioni spostate ({customCount})
              </button>
            )}
          </section>
        </div>
      </main>

      <footer className="foot">
        <p>
          Schemi del sistema 5-1 con ricezione a tre. Squadre, nomi e posizioni restano salvati in questo browser. Ispirato a{' '}
          <a href="https://rotazioni.volleyserve.it/" target="_blank" rel="noreferrer">
            Rotazioni volley
          </a>
          .
        </p>
      </footer>

      <div className="toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>
    </div>
  );
}
