import type { Gender } from './domain/types';

/** Colori del campo. Stanno qui, e non nel CSS, così l'immagine esportata è identica a quella a schermo. */
export const COURT_COLORS = {
  freeZone: '#143A6B',
  court: '#1F5FA9',
  line: '#F4F7FB',
  zoneNumber: '#F4F7FB',
  pill: '#0B1730',
  pillText: '#F4F7FB',
  caption: '#C9D8EE',
  arrow: '#F4F7FB',
  ok: '#6BE39A',
  fault: '#FF5D5D',
  ball: '#F5C518',
  ballLine: '#143A6B',
} as const;

export interface BadgeStyle {
  fill: string;
  text: string;
  ring: string;
}

/** Un colore per famiglia di ruolo: si segue a colpo d'occhio dove va ognuno. */
export const ROLE_COLORS: Record<'P' | 'S' | 'C' | 'O' | 'L', BadgeStyle> = {
  P: { fill: '#F5C518', text: '#1B1400', ring: '#FFFFFF' },
  S: { fill: '#FFFFFF', text: '#12284B', ring: '#12284B' },
  C: { fill: '#0E1E3A', text: '#FFFFFF', ring: '#FFFFFF' },
  O: { fill: '#FF8A3D', text: '#2A1200', ring: '#FFFFFF' },
  L: { fill: '#F0489A', text: '#FFFFFF', ring: '#FFFFFF' },
};

export const GENDER_COLORS: Record<Gender, BadgeStyle> = {
  M: { fill: '#1D3FA8', text: '#FFFFFF', ring: '#FFFFFF' },
  F: { fill: '#EC4899', text: '#FFFFFF', ring: '#FFFFFF' },
};

export const SETTER_RING = '#F5C518';

export const FONT_STACK = "'Archivo Variable', 'Arial Narrow', Arial, sans-serif";
