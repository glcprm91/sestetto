import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GA_ENABLED } from './analytics/config';
import { readConsent, saveConsent } from './analytics/consent';
import { startGoogleAnalytics, stopGoogleAnalytics } from './analytics/google';
import { sceneCaption } from './captions';
import { DefenseOptions, PhaseBar, PlayButton, RadiusStepper, RotationBar, Segmented, SituationSwitch, Switch } from './components/Controls';
import { CookieBanner } from './components/CookieBanner';
import { Court, type CourtSelection } from './components/Court';
import { Guide } from './components/Guide';
import { LogoMark } from './components/Logo';
import { Roster } from './components/Roster';
import { noteKey, sceneKey } from './domain/formations';
import { sceneHint } from './domain/hints';
import { nextRotation, prevRotation, ROTATION_ORDER } from './domain/lineup';
import { clampToRange, moveRange, type MoveRange } from './domain/range';
import { buildScene } from './domain/scene';
import { displayName } from './domain/team';
import { PHASES, type AttackFrom, type PhaseId, type PlayerId, type Point, type Rotation, type SceneContext, type Situation } from './domain/types';
import { downloadPng } from './export/png';
import { shareUrl, teamFromHash } from './state/share';
import { activeTeam, loadState, reducer, saveState } from './state/store';
import { SITE } from '../site.config';

const FREE: MoveRange = { kind: 'libero' };

/** Cosa può fare il giocatore selezionato, detto a parole. */
function rangeText(range: MoveRange, limited: boolean): string {
  if (range.kind === 'area') {
    return range.reason === 'servizio'
      ? 'è al servizio: può battere da qualsiasi punto dietro la linea di fondo.'
      : 'può stare in tutta l’area gialla senza fallo di posizione. I limiti sono i compagni vicini: se sposti loro, l’area cambia.';
  }
  if (range.kind === 'cerchio') return 'si sposta dentro il cerchio giallo, attorno al punto in cui lo mette lo schema.';
  return limited
    ? 'non ha un’area regolare, perché i compagni vicini sono già in fallo tra loro: sistemali e i limiti tornano.'
    : 'si sposta liberamente: i limiti sono disattivati.';
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [rotation, setRotation] = useState<Rotation>(1);
  const [situation, setSituation] = useState<Situation>('ricezione');
  const [phase, setPhase] = useState<PhaseId>('ricezione');
  const [attackFrom, setAttackFrom] = useState<AttackFrom>('attesa');
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<PlayerId | null>(null);
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState('');
  /** Il banner dei cookie esiste solo con Google Analytics attivo, e si decide dopo il caricamento. */
  const [askConsent, setAskConsent] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<HTMLElement | null>(null);

  const team = activeTeam(state);
  const { settings } = state;
  const ctx: SceneContext = useMemo(() => ({ rotation, situation, phase, attackFrom }), [rotation, situation, phase, attackFrom]);
  const scene = useMemo(() => buildScene(team, ctx), [team, ctx]);
  const key = sceneKey(ctx, team.defenseSystem);

  /** Fin dove può andare un giocatore in questa scena. */
  const rangeOf = useCallback(
    (id: PlayerId): MoveRange => (settings.limitMoves ? moveRange(scene, id, settings.moveRadius) : FREE),
    [scene, settings.limitMoves, settings.moveRadius],
  );

  // Chi esce dal campo (per esempio il centrale sostituito dal libero) non resta selezionato.
  const selectedOnCourt = selected && scene.positions[selected] ? selected : null;
  const range = selectedOnCourt ? rangeOf(selectedOnCourt) : null;

  const courtSettings = useMemo(
    () => ({ ...settings, showFaults: settings.showFaults || (selectedOnCourt !== null && !settings.limitMoves) }),
    [settings, selectedOnCourt],
  );

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
    if (!GA_ENABLED) return;
    const consent = readConsent();
    if (consent?.analytics) startGoogleAnalytics();
    else if (!consent) setAskConsent(true);
  }, []);

  const chooseConsent = (analytics: boolean) => {
    saveConsent(analytics);
    if (analytics) startGoogleAnalytics();
    else stopGoogleAnalytics();
    setAskConsent(false);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Scorrimento automatico: un momento dopo l'altro fino al contrattacco.
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
      if (phases[index + 1] !== 'contrattacco') setAttackFrom('attesa');
    }, 1600);
    return () => clearTimeout(timer);
  }, [playing, phase, situation]);

  const selectPhase = (next: PhaseId) => {
    setPlaying(false);
    setPhase(next);
    // Tra difesa e contrattacco resta la scelta fatta sulla palla avversaria: il contrattacco parte da lì.
    if (next !== 'difesa' && next !== 'contrattacco') setAttackFrom('attesa');
  };

  const selectSituation = (next: Situation) => {
    setPlaying(false);
    setSelected(null);
    setSituation(next);
    setAttackFrom('attesa');
    if (!PHASES[next].includes(phase)) setPhase(next);
  };

  const selectRotation = (next: Rotation) => {
    setSelected(null);
    setRotation(next);
  };

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    const phases = PHASES[situation];
    if (phases.indexOf(phase) >= phases.length - 1) setPhase(phases[0]);
    setAttackFrom('attesa');
    setShowAll(false);
    setSelected(null);
    setPlaying(true);
  };

  const toggleOverview = () => {
    setPlaying(false);
    setSelected(null);
    setShowAll(!showAll);
    // Su telefono i comandi stanno sotto il campo: lo riporto in vista.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stageRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const selectPlayer = useCallback((id: PlayerId | null) => {
    if (id) setPlaying(false);
    setSelected(id);
  }, []);

  const movePlayer = useCallback(
    (id: PlayerId, point: Point) => dispatch({ type: 'custom/move', key, id, point: clampToRange(point, rangeOf(id)) }),
    [key, rangeOf],
  );

  const selection: CourtSelection = { selected: selectedOnCourt, range, onSelect: selectPlayer, onMove: movePlayer };

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
      const moment = phase === 'difesa' && attackFrom !== 'attesa' ? `difesa-${attackFrom}` : phase;
      await downloadPng(svgRef.current, `${slug}-p${rotation}-${moment}.png`);
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
  const selectedMoved = selectedOnCourt !== null && Boolean(team.custom[key]?.[selectedOnCourt]);

  return (
    <div className="app">
      <header className="top">
        <p className="brand__name">
          <LogoMark />
          <span>{SITE.name}</span>
        </p>
        <label className="team-picker">
          <span className="visually-hidden">Squadra</span>
          <select
            value={team.id}
            onChange={(event) => {
              setSelected(null);
              dispatch({ type: 'team/select', id: event.target.value });
            }}
          >
            {state.teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || 'Squadra senza nome'}
              </option>
            ))}
          </select>
        </label>
        <h1 className="brand__tagline">{SITE.tagline}</h1>
      </header>

      <main className="board">
        <section className={`stage${showAll ? ' stage--tall' : ''}`} aria-label="Campo" ref={stageRef}>
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
              <Court team={team} scene={scene} settings={courtSettings} caption={sceneCaption(ctx)} selection={selection} svgRef={svgRef} />
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

        {/* Su telefono sta sotto il campo, su schermo largo in cima alla colonna dei comandi: il campo non si sposta mai. */}
        <div className="selection-slot">
          {!showAll && !selectedOnCourt && <p className="stage-note">Seleziona un giocatore sul campo per spostarlo.</p>}

          {!showAll && selectedOnCourt && range && (
            <div className="edit-bar" role="group" aria-label="Giocatore selezionato">
              <p>
                <strong>{displayName(team, selectedOnCourt)}</strong> {rangeText(range, settings.limitMoves)}
              </p>
              {range.kind === 'cerchio' && (
                <RadiusStepper value={settings.moveRadius} onChange={(moveRadius) => dispatch({ type: 'settings/patch', patch: { moveRadius } })} />
              )}
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={!selectedMoved}
                  onClick={() => dispatch({ type: 'custom/resetPlayer', key, id: selectedOnCourt })}
                >
                  Riporta allo schema
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setSelected(null)}>
                  Fatto
                </button>
              </div>
            </div>
          )}
        </div>

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
              onSelect={selectRotation}
              onNext={() => selectRotation(nextRotation(rotation))}
              onPrev={() => selectRotation(prevRotation(rotation))}
            />
          </section>

          <section className="section" aria-label="Spiegazione e strumenti">
            <p className="hint">{sceneHint(team, ctx)}</p>
            <div className="row">
              <button type="button" className="btn" aria-pressed={showAll} onClick={toggleOverview}>
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
            <Switch
              label="Sposta i giocatori solo entro il loro range"
              checked={settings.limitMoves}
              onChange={(limitMoves) => dispatch({ type: 'settings/patch', patch: { limitMoves } })}
            />

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
            {scene.customized && (
              <button type="button" className="btn btn--quiet" onClick={() => dispatch({ type: 'custom/reset', key })}>
                Riporta questo momento allo schema
              </button>
            )}
            {customCount > 0 && (
              <button type="button" className="btn btn--quiet" onClick={() => dispatch({ type: 'custom/resetAll' })}>
                Ripristina tutte le posizioni spostate ({customCount})
              </button>
            )}
          </section>
        </div>
      </main>

      <Guide />

      <footer className="foot">
        <p>
          Schemi del sistema 5-1 con ricezione a tre. Squadre, nomi e posizioni restano salvati in questo browser. Ispirato a{' '}
          <a href="https://rotazioni.volleyserve.it/" target="_blank" rel="noreferrer">
            Rotazioni volley
          </a>
          .
        </p>
        <p className="foot__links">
          <a href="/privacy">Privacy</a>
          {GA_ENABLED && (
            <button type="button" className="link-button" onClick={() => setAskConsent(true)}>
              Preferenze cookie
            </button>
          )}
        </p>
      </footer>

      {askConsent && <CookieBanner onChoice={chooseConsent} />}

      <div className="toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>
    </div>
  );
}
