"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Claude Fable 5.1 — "Kin"
 *
 * A small ceramic robot that was broken and mended with gold. On the dark
 * theme it is pale porcelain; on the light theme, dark stoneware. Gold runs
 * along every break and every joint: the places it bends are the places it
 * was repaired. Hover, tap, focus and press Enter or Space, and the pieces
 * part along the seams, hang suspended, and show a spectrum of light held
 * inside.
 *
 * Implementation: every fragment is the whole head or torso clipped to one
 * region of a crack tiling, so the silhouette is seamless when closed and each
 * piece can translate on its own when open. A single custom property
 * (--k-open) drives the open state through calc(), so hover, the pinned
 * toggle, and reduced motion all share one set of rules. IDs, classes and
 * keyframes are scoped with useId so several instances can share a page.
 */

interface RobotProps {
  className?: string;
}

type Fragment = { key: string; region: string; dx: number; dy: number };

const TORSO_PATH =
  'M152 192 H248 C260 192 268 200 269 212 L275 296 C277 320 256 338 232 338 H168 C144 338 123 320 125 296 L131 212 C132 200 140 192 152 192 Z';

// Crack tilings. Each region list tiles a rectangle around the shape; the shape
// itself clips the tiling, so every fragment is shape ∩ region. Seams are the
// shared edges between neighbouring regions, listed once.
const HEAD_FRAGMENTS: Fragment[] = [
  { key: 'h1', dx: -6, dy: 0, region: '100,30 150,30 160,50 176,64 196,72 216,76 236,80 248,88 230,98 212,108 203,124 194,144 178,160 160,172 140,184 128,200 100,200' },
  { key: 'h2', dx: 0, dy: -7, region: '150,30 288,30 280,40 268,62 248,88 236,80 216,76 196,72 176,64 160,50' },
  { key: 'h3', dx: 7, dy: -1, region: '288,30 300,30 300,200 272,200 262,186 244,170 226,158 210,152 194,144 203,124 212,108 230,98 248,88 268,62 280,40' },
  { key: 'h4', dx: 1, dy: 6, region: '194,144 210,152 226,158 244,170 262,186 272,200 128,200 140,184 160,172 178,160' },
];
// The cracks radiate from one impact point near the top-right rim.
const HEAD_SEAMS = [
  '288,30 280,40 268,62 248,88 230,98 212,108 203,124 194,144 178,160 160,172 140,184 128,200',
  '248,88 236,80 216,76 196,72 176,64 160,50 150,30',
  '194,144 210,152 226,158 244,170 262,186 272,200',
];
const TORSO_FRAGMENTS: Fragment[] = [
  { key: 't1', dx: 0, dy: -5, region: '100,180 300,180 300,256 286,258 256,262 232,270 206,282 184,288 168,262 146,244 118,232 100,236' },
  { key: 't2', dx: 7, dy: 3, region: '300,256 300,350 226,350 214,330 198,306 184,288 206,282 232,270 256,262 286,258' },
  { key: 't3', dx: 1, dy: 7, region: '168,262 184,288 198,306 214,330 226,350 144,350 150,318 160,290' },
  { key: 't4', dx: -7, dy: 3, region: '100,236 118,232 146,244 168,262 160,290 150,318 144,350 100,350' },
];
const TORSO_SEAMS = [
  '100,236 118,232 146,244 168,262 184,288 198,306 214,330 226,350',
  '184,288 206,282 232,270 256,262 286,258 300,256',
  '168,262 160,290 150,318 144,350',
];
const FLECKS: [number, number, number][] = [[70, 132, 1.8], [330, 96, 2.2], [338, 268, 1.6], [62, 300, 2], [300, 372, 1.4], [96, 56, 1.5]];

const shift = (dx: number, dy: number) => ({ transform: `translate(calc(var(--k-open) * ${dx}px), calc(var(--k-open) * ${dy}px))` });
// While the pieces are parted they hang suspended and drift a little, each on its own slow cycle.
const drift = (seconds: number, delay: number) => ({ animationDuration: `${seconds}s`, animationDelay: `${delay}s` });

function Seams({ id, paths, clip, delay }: { id: string; paths: string[]; clip: string; delay: number }) {
  return (
    <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((points, i) => <polyline key={`gold-glow-${i}`} points={points} stroke={`url(#${id}-gold)`} className="seam-glow-gold" />)}
      {paths.map((points, i) => <polyline key={`light-glow-${i}`} points={points} stroke={`url(#${id}-light)`} className="seam-glow-light" />)}
      {paths.map((points, i) => <polyline key={`gold-${i}`} points={points} stroke={`url(#${id}-gold)`} className="seam-gold" />)}
      {paths.map((points, i) => <polyline key={`glint-${i}`} points={points} pathLength={300} className="seam-glint" style={{ animationDelay: `${delay + i * 2.3}s` }} />)}
    </g>
  );
}

export default function Fable51Robot({ className = '' }: RobotProps) {
  const id = `kin-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(value => !value);
  const onKeyDown = (event: KeyboardEvent<SVGRectElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const gold = `url(#${id}-gold)`;
  const light = `url(#${id}-light)`;
  const R = `.${id}`;
  const css = `
${R}{--k-open:0;--k-play:paused;--k-c1:#f2ede3;--k-c2:#d2cab8;--k-c3:#fbf8f1;--k-joint:#363b41;--k-eye:#24282d;--k-eye-ring:#15181b;--k-eye-glint:#ffffff;--k-shadow:rgba(0,0,0,.42);--k-ring:.2}
:root[data-theme="light"] ${R}{--k-c1:#464c53;--k-c2:#22262b;--k-c3:#5d646c;--k-joint:#d9d3c5;--k-eye:#ece6d8;--k-eye-ring:#f6f2e9;--k-eye-glint:#2a2e33;--k-shadow:rgba(0,0,0,.16);--k-ring:.32}
${R}.is-open{--k-open:1;--k-play:running}
@media (hover:hover) and (pointer:fine){${R}:hover{--k-open:1;--k-play:running}}
${R} .stop-hi{stop-color:var(--k-c3)}${R} .stop-mid{stop-color:var(--k-c1)}${R} .stop-lo{stop-color:var(--k-c2)}
${R} .stop-hi,${R} .stop-mid,${R} .stop-lo{transition:stop-color .4s ease}
${R} .ceramic{fill:url(#${id}-ceramic)}
${R} .ceramic-stroke{stroke:url(#${id}-ceramic)}
${R} .joint{fill:var(--k-joint);transition:fill .4s ease}
${R} .eye-base{fill:var(--k-eye);stroke:var(--k-eye-ring);transition:fill .4s ease,stroke .4s ease}
${R} .eye-glint{fill:var(--k-eye-glint);transition:fill .4s ease}
${R} .eye-awake{opacity:calc(var(--k-open) * .95);transition:opacity .35s ease}
${R} .eye{transform-box:fill-box;transform-origin:center;animation:${id}-blink 6.5s ease-in-out infinite}
${R} .shadow{fill:var(--k-shadow);transition:fill .4s ease}
${R} .frag{transition:transform .55s cubic-bezier(.2,.75,.2,1)}
${R} .drift{animation:${id}-drift 6s ease-in-out infinite;animation-play-state:var(--k-play)}
${R} .seam-glow-gold{stroke-width:6;opacity:calc(.2 * (1 - var(--k-open)));transition:opacity .4s ease}
${R} .seam-glow-light{stroke-width:7;opacity:calc(.65 * var(--k-open));transition:opacity .4s ease}
${R} .seam-gold{stroke-width:2.4}
${R} .seam-glint{stroke:#fff7d6;stroke-width:1.3;stroke-dasharray:14 600;stroke-dashoffset:614;animation:${id}-glint 9s linear infinite}
${R} .ring-gold{opacity:calc(var(--k-ring) * (1 - var(--k-open)));transition:opacity .5s ease}
${R} .ring-light{opacity:calc(.55 * var(--k-open));transition:opacity .5s ease}
${R} .halo{opacity:calc(.3 * var(--k-open));transition:opacity .6s ease;animation:${id}-breathe 5s ease-in-out infinite;animation-play-state:var(--k-play)}
${R} .fleck{opacity:calc(.35 + .55 * var(--k-open));transition:opacity .5s ease}
${R} .hit{outline:none;cursor:pointer}
${R} .focus-ring{opacity:0;transition:opacity .15s ease}
${R} .hit:focus-visible + .focus-ring{opacity:1}
@keyframes ${id}-glint{to{stroke-dashoffset:0}}
@keyframes ${id}-drift{0%,100%{transform:translate(0,0)}33%{transform:translate(calc(var(--k-open) * 1.2px),calc(var(--k-open) * -1.8px))}66%{transform:translate(calc(var(--k-open) * -1px),calc(var(--k-open) * 1.4px))}}
@keyframes ${id}-breathe{0%,100%{opacity:calc(.26 * var(--k-open))}50%{opacity:calc(.4 * var(--k-open))}}
@keyframes ${id}-blink{0%,93%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.1)}}
@media (prefers-reduced-motion:reduce){
${R} .seam-glint{display:none}
${R} .eye,${R} .drift,${R} .halo{animation:none}
${R} .seam-glow-light{opacity:calc(.28 + .4 * var(--k-open))}
${R} .frag,${R} .seam-glow-gold,${R} .seam-glow-light,${R} .ring-gold,${R} .ring-light,${R} .halo,${R} .fleck,${R} .eye-awake,${R} .focus-ring{transition:none}
}`;

  const fragments = (shape: string, list: Fragment[], extras: Record<string, ReactNode> = {}) =>
    list.map((fragment, index) => (
      <g key={fragment.key} className="frag" style={shift(fragment.dx, fragment.dy)}>
        <g className="drift" style={drift(5.2 + index * 0.9, -index * 1.3)}>
          <g clipPath={`url(#${id}-${fragment.key})`}>
            <use href={`#${id}-${shape}`} className="ceramic" />
            {extras[fragment.key]}
          </g>
        </g>
      </g>
    ));

  const eye = (x: number) => (
    <g className="eye">
      <rect x={x} y={104} width={18} height={26} rx={9} strokeWidth={1.5} className="eye-base" />
      <rect x={x} y={104} width={18} height={26} rx={9} fill="#ffd66e" className="eye-awake" />
      <circle cx={x + 13} cy={110} r={2.6} className="eye-glint" opacity={0.85} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 400 400"
      role="group"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={`${id} w-full h-full ${open ? 'is-open' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>Kin, a mended robot</title>
      <desc id={descId}>
        A small ceramic robot that was broken and mended with gold. Its body is pale porcelain on the dark theme and dark stoneware on the light theme, and gold runs along every break and every joint. Hover, tap, or press Enter to part the pieces along the seams: they hang suspended and reveal a spectrum of light held inside.
      </desc>
      <style>{css}</style>

      <defs>
        <rect id={`${id}-head`} x={126} y={56} width={148} height={122} rx={44} />
        <path id={`${id}-torso`} d={TORSO_PATH} />
        <clipPath id={`${id}-head-clip`}><use href={`#${id}-head`} /></clipPath>
        <clipPath id={`${id}-torso-clip`}><use href={`#${id}-torso`} /></clipPath>
        {[...HEAD_FRAGMENTS, ...TORSO_FRAGMENTS].map(fragment => (
          <clipPath key={fragment.key} id={`${id}-${fragment.key}`}><polygon points={fragment.region} /></clipPath>
        ))}
        <linearGradient id={`${id}-ceramic`} gradientUnits="userSpaceOnUse" x1={120} y1={40} x2={290} y2={380}>
          <stop offset="0" className="stop-hi" />
          <stop offset="0.3" className="stop-mid" />
          <stop offset="1" className="stop-lo" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} gradientUnits="userSpaceOnUse" x1={110} y1={40} x2={300} y2={370}>
          <stop offset="0" stopColor="#f8e09a" />
          <stop offset="0.45" stopColor="#d6a746" />
          <stop offset="0.7" stopColor="#b7842a" />
          <stop offset="1" stopColor="#f0d078" />
        </linearGradient>
        <linearGradient id={`${id}-light`} gradientUnits="userSpaceOnUse" x1={0} y1={40} x2={0} y2={380}>
          <stop offset="0" stopColor="#ff5f6d" />
          <stop offset="0.2" stopColor="#ff9f43" />
          <stop offset="0.4" stopColor="#ffd93d" />
          <stop offset="0.6" stopColor="#4fd67a" />
          <stop offset="0.8" stopColor="#3fa9ff" />
          <stop offset="1" stopColor="#b16cff" />
        </linearGradient>
        <radialGradient id={`${id}-fade`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.55" stopColor="#fff" stopOpacity={0.6} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <mask id={`${id}-halo-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={400} height={400}>
          <ellipse cx={200} cy={214} rx={160} ry={185} fill={`url(#${id}-fade)`} />
        </mask>
      </defs>

      <g aria-hidden="true">
        {/* Light spilling out when the pieces part */}
        <ellipse cx={200} cy={214} rx={160} ry={185} fill={light} mask={`url(#${id}-halo-mask)`} className="halo" />
        <circle cx={200} cy={212} r={172} fill="none" stroke={gold} strokeWidth={1.5} className="ring-gold" />
        <circle cx={200} cy={212} r={172} fill="none" stroke={light} strokeWidth={1.5} className="ring-light" />
        {FLECKS.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={gold} className="fleck" />)}

        <g transform="translate(200 300) scale(1.06) translate(-200 -300)">
          <ellipse cx={200} cy={388} rx={64} ry={5} className="shadow" />

          {/* Legs */}
          <line x1={178} y1={326} x2={174} y2={372} strokeWidth={28} strokeLinecap="round" className="ceramic-stroke" />
          <line x1={222} y1={326} x2={226} y2={372} strokeWidth={28} strokeLinecap="round" className="ceramic-stroke" />
          <ellipse cx={175} cy={360} rx={14} ry={4} fill="none" stroke={gold} strokeWidth={2} />
          <ellipse cx={225} cy={360} rx={14} ry={4} fill="none" stroke={gold} strokeWidth={2} />

          {/* Arms: the joints are gold, like every place it bends */}
          <g className="frag" style={shift(-4, 1)}>
            <g className="drift" style={drift(7.4, -2.1)}>
              <line x1={118} y1={224} x2={108} y2={300} strokeWidth={26} strokeLinecap="round" className="ceramic-stroke" />
              <circle cx={107} cy={308} r={14} className="ceramic" />
              <ellipse cx={108} cy={295} rx={12.5} ry={3.8} fill="none" stroke={gold} strokeWidth={2} />
              <circle cx={118} cy={224} r={7} fill="none" stroke={gold} strokeWidth={2.2} />
            </g>
          </g>
          <g className="frag" style={shift(4, 1)}>
            <g className="drift" style={drift(6.6, -4.4)}>
              <line x1={282} y1={224} x2={292} y2={300} strokeWidth={26} strokeLinecap="round" className="ceramic-stroke" />
              <circle cx={293} cy={308} r={14} className="ceramic" />
              <ellipse cx={292} cy={295} rx={12.5} ry={3.8} fill="none" stroke={gold} strokeWidth={2} />
              <circle cx={282} cy={224} r={7} fill="none" stroke={gold} strokeWidth={2.2} />
            </g>
          </g>

          {/* Neck */}
          <rect x={186} y={172} width={28} height={26} rx={7} className="joint" />
          <ellipse cx={200} cy={185} rx={14} ry={3.5} fill="none" stroke={gold} strokeWidth={2} />

          {/* Torso: inner light, then the mended pieces, then the gold */}
          <g>
            <use href={`#${id}-torso`} fill={light} />
            {fragments('torso', TORSO_FRAGMENTS)}
            <Seams id={id} paths={TORSO_SEAMS} clip={`${id}-torso-clip`} delay={4.5} />
          </g>

          {/* Head, tilted a little, as if listening */}
          <g transform="rotate(-3 200 180)">
            <use href={`#${id}-head`} fill={light} />
            {fragments('head', HEAD_FRAGMENTS, { h1: eye(163), h3: eye(219) })}
            <g className="frag" style={shift(0, -7)}>
              <g className="drift" style={drift(6.1, -1.3)}>
                <line x1={200} y1={58} x2={200} y2={42} stroke={gold} strokeWidth={3} strokeLinecap="round" />
                <circle cx={200} cy={35} r={6.5} fill={gold} />
              </g>
            </g>
            <Seams id={id} paths={HEAD_SEAMS} clip={`${id}-head-clip`} delay={0} />
          </g>
        </g>
      </g>

      <rect
        className="hit"
        role="button"
        tabIndex={0}
        aria-pressed={open}
        aria-label="Part the mended pieces to reveal the light inside"
        x={0} y={0} width={400} height={400}
        fill="none" pointerEvents="all"
        onClick={toggle}
        onKeyDown={onKeyDown}
      />
      <rect className="focus-ring" x={78} y={6} width={244} height={392} rx={30} fill="none" stroke={gold} strokeWidth={2} strokeDasharray="6 6" pointerEvents="none" />
    </svg>
  );
}
