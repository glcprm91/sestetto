import { newId, sanitizeTeam } from '../domain/team';
import type { Team } from '../domain/types';

const HASH_PREFIX = '#squadra=';

function toBase64Url(textValue: string): string {
  const bytes = new TextEncoder().encode(textValue);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeTeam(team: Team): string {
  const { id: _id, ...rest } = team;
  return toBase64Url(JSON.stringify(rest));
}

/** Legge una squadra da un link condiviso; le dà un id nuovo per non sovrascrivere nulla. */
export function decodeTeam(encoded: string): Team | null {
  try {
    const team = sanitizeTeam(JSON.parse(fromBase64Url(encoded)));
    if (!team) return null;
    team.id = newId();
    return team;
  } catch {
    return null;
  }
}

export function shareUrl(team: Team, base: string): string {
  return `${base.split('#')[0]}${HASH_PREFIX}${encodeTeam(team)}`;
}

export function teamFromHash(hash: string): Team | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return decodeTeam(hash.slice(HASH_PREFIX.length));
}
