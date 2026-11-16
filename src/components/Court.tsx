import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { ATTACK_ORIGIN } from '../domain/formations';
import type { Scene } from '../domain/scene';
import { clampPoint, displayName } from '../domain/team';
import { ROLE_META, type PlayerId, type Point, type Team, type Zone } from '../domain/types';
import type { Settings } from '../state/store';
import { COURT_COLORS, FONT_STACK, GENDER_COLORS, ROLE_COLORS, SETTER_RING, type BadgeStyle } from '../theme';

/** Unità SVG per metro. */
const U = 100;
export const VIEWBOX = { x: -70, y: -105, w: 1040, h: 1190 };
const BADGE_R = 50;

const ZONE_LABELS: { zone: Zone; x: number; y: number }[] = [
  { zone: 4, x: 34, y: 96 },
  { zone: 3, x: 334, y: 96 },
  { zone: 2, x: 634, y: 96 },
  { zone: 5, x: 34, y: 396 },
  { zone: 6, x: 334, y: 396 },
  { zone: 1, x: 634, y: 396 },
];

interface CourtProps {
  team: Team;
  scene: Scene;
  settings: Settings;
  /** Riga di testo in basso a sinistra: dice cosa si sta guardando. */
  caption: string;
  editable?: boolean;
  onMove?: (id: PlayerId, point: Point) => void;
  svgRef?: Ref<SVGSVGElement>;
}

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

/** Larghezza approssimata di un'etichetta, per disegnarle dietro il fondo. */
function labelWidth(label: string, size: number): number {
  let units = 0;
  for (const char of label) units += /[mwMW]/.test(char) ? 0.86 : /[ilj.' ]/.test(char) ? 0.3 : /[A-Z]/.test(char) ? 0.66 : 0.54;
  return Math.max(64, units * size + 30);
}

interface NameLabel {
  id: PlayerId;
  text: string;
  width: number;
  x: number;
  y: number;
  shift: number;
}

/** Sposta di lato le etichette dei giocatori vicini, così i nomi non si coprono. */
function spreadLabels(labels: NameLabel[]): Partial<Record<PlayerId, NameLabel>> {
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        if (Math.abs(a.y - b.y) > 52) continue;
        const distance = b.x + b.shift - (a.x + a.shift);
        const overlap = (a.width + b.width) / 2 + 8 - Math.abs(distance);
        if (overlap <= 0) continue;
        const direction = distance >= 0 ? 1 : -1;
        a.shift -= (direction * overlap) / 2;
        b.shift += (direction * overlap) / 2;
      }
    }
  }
  const byId: Partial<Record<PlayerId, NameLabel>> = {};
  for (const label of labels) byId[label.id] = label;
  return byId;
}

function badgeStyle(team: Team, id: PlayerId, settings: Settings): BadgeStyle {
  if (settings.colorMode === 'genere') {
    const base = GENDER_COLORS[team.players[id].gender];
    return id === 'P' ? { ...base, ring: SETTER_RING } : base;
  }
  return ROLE_COLORS[ROLE_META[id].family];
}

function Ball({ x, y }: Point) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={25} fill={COURT_COLORS.ball} stroke={COURT_COLORS.ballLine} strokeWidth={4} />
      <path d="M-22 -8 Q0 -18 22 -8 M-22 8 Q0 18 22 8 M0 -24 Q-10 0 0 24" fill="none" stroke={COURT_COLORS.ballLine} strokeWidth={3.5} />
    </g>
  );
}

export function Court({ team, scene, settings, caption, editable = false, onMove, svgRef }: CourtProps) {
  const markerId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const localRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: PlayerId; dx: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState<PlayerId | null>(null);

  const { positions, previous, court, checks, ctx } = scene;
  const players = (Object.keys(positions) as PlayerId[]).sort();

  const setRefs = (node: SVGSVGElement | null) => {
    localRef.current = node;
    if (typeof svgRef === 'function') svgRef(node);
    else if (svgRef) (svgRef as { current: SVGSVGElement | null }).current = node;
  };

  const toMetres = (event: PointerEvent): Point | null => {
    const svg = localRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x / U, y: local.y / U };
  };

  const startDrag = (id: PlayerId) => (event: PointerEvent<SVGGElement>) => {
    if (!editable) return;
    const at = toMetres(event);
    const current = positions[id];
    if (!at || !current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, dx: current.x - at.x, dy: current.y - at.y };
    setDragging(id);
  };

  const moveDrag = (event: PointerEvent<SVGGElement>) => {
    const active = drag.current;
    if (!active) return;
    const at = toMetres(event);
    if (at) onMove?.(active.id, clampPoint({ x: at.x + active.dx, y: at.y + active.dy }));
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(null);
  };

  const nudge = (id: PlayerId) => (event: KeyboardEvent<SVGGElement>) => {
    if (!editable) return;
    const step = event.shiftKey ? 0.5 : 0.1;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = delta[event.key];
    const current = positions[id];
    if (!move || !current) return;
    event.preventDefault();
    onMove?.(id, clampPoint({ x: current.x + move.x, y: current.y + move.y }));
  };

  const labels = spreadLabels(
    players.flatMap((id) => {
      const text = clip(team.players[id].name.trim(), 12);
      const point = positions[id]!;
      return text ? [{ id, text, width: labelWidth(text, 34), x: point.x * U, y: point.y * U, shift: 0 }] : [];
    }),
  );

  const arrows =
    settings.showArrows && previous
      ? players.flatMap((id) => {
          const from = previous[id];
          const to = positions[id];
          if (!from || !to) return [];
          const length = Math.hypot(to.x - from.x, to.y - from.y);
          if (length < 1.3) return [];
          const ux = (to.x - from.x) / length;
          const uy = (to.y - from.y) / length;
          const gap = BADGE_R / U + 0.16;
          return [{ id, x1: from.x * U, y1: from.y * U, x2: (to.x - ux * gap) * U, y2: (to.y - uy * gap) * U }];
        })
      : [];

  const attack = ctx.phase === 'difesa' && ctx.attackFrom !== 'attesa' ? ATTACK_ORIGIN[ctx.attackFrom] : null;
  const server = ctx.phase === 'battuta' ? positions[court.byZone[1]] : null;

  const describe = players
    .map((id) => `${displayName(team, id)} in posto ${court.zones[id]}`)
    .join(', ');

  return (
    <svg
      ref={setRefs}
      className={`court${editable ? ' is-editable' : ''}`}
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
      role="img"
      aria-label={`${caption}. ${describe}.`}
      fontFamily={FONT_STACK}
    >
      <defs>
        <marker id={`a${markerId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={COURT_COLORS.arrow} />
        </marker>
        <marker id={`b${markerId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={COURT_COLORS.ball} />
        </marker>
        <pattern id={`n${markerId}`} width="16" height="30" patternUnits="userSpaceOnUse">
          <path d="M8 0 V30 M0 15 H16" stroke={COURT_COLORS.line} strokeWidth="2" opacity="0.45" />
        </pattern>
      </defs>

      <rect x={VIEWBOX.x} y={VIEWBOX.y} width={VIEWBOX.w} height={VIEWBOX.h} rx={28} fill={COURT_COLORS.freeZone} />
      <rect x={0} y={0} width={900} height={900} fill={COURT_COLORS.court} />

      {ZONE_LABELS.map(({ zone, x, y }) => (
        <text key={zone} x={x} y={y} fontSize={84} fontWeight={800} fill={COURT_COLORS.zoneNumber} opacity={0.26} style={{ fontStretch: '68%' }}>
          {zone}
        </text>
      ))}

      <rect x={0} y={0} width={900} height={900} fill="none" stroke={COURT_COLORS.line} strokeWidth={7} />
      <line x1={0} y1={300} x2={900} y2={300} stroke={COURT_COLORS.line} strokeWidth={6} />
      <path d="M-58 300 H-14 M914 300 H958" stroke={COURT_COLORS.line} strokeWidth={6} strokeDasharray="12 10" />

      {/* Rete */}
      <rect x={-34} y={-36} width={968} height={30} fill={`url(#n${markerId})`} />
      <line x1={-40} y1={-36} x2={940} y2={-36} stroke={COURT_COLORS.line} strokeWidth={8} strokeLinecap="round" />
      <text x={938} y={-58} textAnchor="end" fontSize={30} fontWeight={500} fill={COURT_COLORS.caption} style={{ fontStretch: '88%' }}>
        Rete
      </text>
      <text x={-38} y={-58} fontSize={30} fontWeight={700} fill={COURT_COLORS.caption} style={{ fontStretch: '80%' }}>
        {clip(team.name, 24)}
      </text>
      <text x={-38} y={1066} fontSize={34} fontWeight={700} fill={COURT_COLORS.caption} style={{ fontStretch: '80%' }}>
        {caption}
      </text>

      {/* Panchina: chi è fuori in questo momento */}
      {court.bench.map((id, index) => {
        const style = badgeStyle(team, id, settings);
        const named = team.players[id].name.trim();
        return (
          <g key={id} transform={`translate(${-6 + index * 330} 968)`}>
            {id === 'L' ? (
              <rect x={-28} y={-28} width={56} height={56} rx={14} fill={style.fill} stroke={style.ring} strokeWidth={4} />
            ) : (
              <circle r={29} fill={style.fill} stroke={style.ring} strokeWidth={4} />
            )}
            <text y={9} textAnchor="middle" fontSize={25} fontWeight={800} fill={style.text} style={{ fontStretch: '70%' }}>
              {ROLE_META[id].code}
            </text>
            <text x={44} y={10} fontSize={28} fontWeight={500} fill={COURT_COLORS.caption} style={{ fontStretch: '88%' }}>
              {named ? `${clip(named, 12)} in panchina` : 'in panchina'}
            </text>
          </g>
        );
      })}

      {checks &&
        settings.showFaults &&
        checks.map((check) => {
          const a = positions[check.a]!;
          const b = positions[check.b]!;
          return (
            <line
              key={`${check.a}-${check.b}`}
              x1={a.x * U}
              y1={a.y * U}
              x2={b.x * U}
              y2={b.y * U}
              stroke={check.ok ? COURT_COLORS.ok : COURT_COLORS.fault}
              strokeWidth={check.ok ? 5 : 11}
              strokeLinecap="round"
              opacity={check.ok ? 0.75 : 1}
            />
          );
        })}

      {arrows.map((arrow) => (
        <circle key={`o${arrow.id}`} cx={arrow.x1} cy={arrow.y1} r={11} fill="none" stroke={COURT_COLORS.arrow} strokeWidth={4} opacity={0.6} />
      ))}
      {arrows.map((arrow) => (
        <line
          key={arrow.id}
          x1={arrow.x1}
          y1={arrow.y1}
          x2={arrow.x2}
          y2={arrow.y2}
          stroke={COURT_COLORS.arrow}
          strokeWidth={5}
          strokeDasharray="6 14"
          strokeLinecap="round"
          opacity={0.6}
          markerEnd={`url(#a${markerId})`}
        />
      ))}

      {attack && (
        <>
          <line
            x1={attack.x * U}
            y1={attack.y * U + 34}
            x2={(attack.x + (4.5 - attack.x) * 0.2) * U}
            y2={attack.y * U + 185}
            stroke={COURT_COLORS.ball}
            strokeWidth={7}
            strokeLinecap="round"
            markerEnd={`url(#b${markerId})`}
          />
          <Ball x={attack.x * U} y={attack.y * U} />
        </>
      )}
      {server && <Ball x={server.x * U - 78} y={server.y * U - 30} />}

      {players.map((id) => {
        const point = positions[id]!;
        const style = badgeStyle(team, id, settings);
        const info = team.players[id];
        const inside = settings.badge === 'numero' && info.number.trim() ? info.number.trim() : ROLE_META[id].code;
        const label = labels[id];
        const replaced = id === 'L' && court.replaced ? `per ${clip(displayName(team, court.replaced), 12)}` : '';
        return (
          <g
            key={id}
            className={`player${dragging === id ? ' is-dragging' : ''}`}
            style={{ transform: `translate(${point.x * U}px, ${point.y * U}px)` }}
            data-x={point.x * U}
            data-y={point.y * U}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `Sposta ${displayName(team, id)} con le frecce` : undefined}
            onPointerDown={startDrag(id)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={nudge(id)}
          >
            {editable && <circle className="player__handle" r={BADGE_R + 14} fill="none" stroke={COURT_COLORS.line} strokeWidth={3} strokeDasharray="7 9" data-export="skip" />}
            {id === 'L' ? (
              <rect x={-46} y={-46} width={92} height={92} rx={22} fill={style.fill} stroke={style.ring} strokeWidth={6} />
            ) : (
              <circle r={BADGE_R - 3} fill={style.fill} stroke={style.ring} strokeWidth={id === 'P' && settings.colorMode === 'genere' ? 8 : 6} />
            )}
            <text y={14} textAnchor="middle" fontSize={inside.length > 2 ? 34 : 40} fontWeight={800} fill={style.text} style={{ fontStretch: '70%' }}>
              {inside}
            </text>
            {label && (
              <g transform={`translate(${label.shift} 0)`}>
                <rect x={-label.width / 2} y={58} width={label.width} height={46} rx={13} fill={COURT_COLORS.pill} opacity={0.94} />
                <text y={92} textAnchor="middle" fontSize={34} fontWeight={600} fill={COURT_COLORS.pillText} style={{ fontStretch: '88%' }}>
                  {label.text}
                </text>
              </g>
            )}
            {replaced && (
              <text x={label?.shift ?? 0} y={label ? 136 : 90} textAnchor="middle" fontSize={27} fontWeight={500} fill={COURT_COLORS.caption} style={{ fontStretch: '88%' }}>
                {replaced}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
