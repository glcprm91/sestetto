import type { ReactNode } from 'react';
import { ROTATION_ORDER } from '../domain/lineup';
import {
  ATTACK_LABEL,
  PHASE_LABEL,
  PHASES,
  SITUATION_LABEL,
  type AttackFrom,
  type DefenseSystem,
  type PhaseId,
  type Rotation,
  type Situation,
} from '../domain/types';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

/** Scelta tra poche alternative, tutte visibili. */
export function Segmented<T extends string>({ label, value, options, onChange, hideLabel }: SegmentedProps<T>) {
  return (
    <div className="field">
      {!hideLabel && <span className="field__label">{label}</span>}
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="segmented__item"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch__track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

const SITUATIONS: Situation[] = ['ricezione', 'battuta'];

export function SituationSwitch({ value, onChange }: { value: Situation; onChange: (value: Situation) => void }) {
  return (
    <Segmented
      label="La squadra è"
      hideLabel
      value={value}
      onChange={onChange}
      options={SITUATIONS.map((situation) => ({ value: situation, label: SITUATION_LABEL[situation] }))}
    />
  );
}

interface PlayButtonProps {
  playing: boolean;
  onToggle: () => void;
}

/** Fa scorrere da soli i momenti dell'azione, uno dopo l'altro. */
export function PlayButton({ playing, onToggle }: PlayButtonProps) {
  const label = playing ? 'Ferma' : "Fai scorrere l'azione";
  return (
    <button type="button" className="btn btn--icon" onClick={onToggle} aria-label={label} title={label}>
      {playing ? (
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M5 4h4v12H5zM11 4h4v12h-4z" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path d="M6 3.5v13l10-6.5z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

interface PhaseBarProps {
  situation: Situation;
  phase: PhaseId;
  onSelect: (phase: PhaseId) => void;
}

/** I momenti dell'azione, in ordine. */
export function PhaseBar({ situation, phase, onSelect }: PhaseBarProps) {
  return (
    <ol className="phases" aria-label="Momento dell'azione">
      {PHASES[situation].map((id) => (
        <li key={id}>
          <button type="button" className="phases__step" aria-pressed={id === phase} onClick={() => onSelect(id)}>
            {PHASE_LABEL[id]}
          </button>
        </li>
      ))}
    </ol>
  );
}

/** In ordine di campo: il posto 2 avversario attacca sulla nostra sinistra, il 4 sulla destra. */
const ATTACKS: AttackFrom[] = ['attesa', 'da2', 'da3', 'da4'];

interface DefenseOptionsProps {
  attackFrom: AttackFrom;
  system: DefenseSystem;
  onAttack: (value: AttackFrom) => void;
  onSystem: (value: DefenseSystem) => void;
}

export function DefenseOptions({ attackFrom, system, onAttack, onSystem }: DefenseOptionsProps) {
  return (
    <div className="defense">
      <Segmented
        label="Attacco avversario"
        value={attackFrom}
        onChange={onAttack}
        options={ATTACKS.map((value) => ({ value, label: ATTACK_LABEL[value] }))}
      />
      <Segmented
        label="Posto 6"
        value={system}
        onChange={onSystem}
        options={[
          { value: 'arretrato', label: 'Arretrato' },
          { value: 'avanzato', label: 'Avanzato' },
        ]}
      />
    </div>
  );
}

interface RotationBarProps {
  rotation: Rotation;
  onSelect: (rotation: Rotation) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function RotationBar({ rotation, onSelect, onNext, onPrev }: RotationBarProps) {
  return (
    <div className="rotation">
      <div className="rotation__grid" role="group" aria-label="Rotazione">
        {ROTATION_ORDER.map((value) => (
          <button key={value} type="button" className="rotation__item" aria-pressed={value === rotation} onClick={() => onSelect(value)}>
            P{value}
          </button>
        ))}
      </div>
      <div className="rotation__actions">
        <button type="button" className="btn" onClick={onPrev}>
          Indietro
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M15.5 10a5.5 5.5 0 1 1-1.9-4.2M14 2.5v3.6h-3.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ruota
        </button>
      </div>
      <p className="note">
        P{rotation}: palleggiatore in posto {rotation}. A ogni cambio palla conquistato si ruota di un posto.
      </p>
    </div>
  );
}
