"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Praxis · Cooperative Council · 2026-09-09 — "Afterimage, the Night Architect"
 *
 * A tall chrome figure stands inside a violet arch above a compressed future
 * New York. One raised hand conducts a broken ring of light carriers that
 * orbits behind its shoulders and returns across its waist into the other,
 * upturned hand. Every fourteen seconds a pulse leaves the prism in its chest,
 * runs up the conducting arm and travels once around the ring. Click or tap
 * and the carriers close the ring and raise a luminous canopy behind the
 * figure: many separate lights becoming one gathering place. Click again to
 * release it. Pointer movement adds a little depth between the arch, the
 * ring and the figure.
 *
 * Implementation notes: limbs are chrome tubes built from stacked strokes
 * (dark edge, shared mercury gradient, white specular line, coloured rim
 * light); plates are filled paths sharing the same gradient so the horizon
 * reflection stays coherent across the whole body. The ring is a circle drawn
 * inside a tilted, squashed coordinate space and clipped into a rear half
 * painted before the figure and a front half painted after it. One custom
 * property (--af-open) drives the canopy state; the theme lives in scoped
 * custom properties so it changes live with data-theme. IDs, classes and
 * keyframes are scoped with useId so several instances can share a page.
 */

interface RobotProps {
  className?: string;
}

const RING = { cx: 400, cy: 290, r: 262, squash: 0.44, tilt: 20 };
const KEYSTONE = { x: 402, y: 72 };

/** Point on the ring, in artwork coordinates, for an angle in the ring's own circle space. */
function ringPoint(degrees: number) {
  const t = (degrees * Math.PI) / 180;
  const x = RING.r * Math.cos(t);
  const y = RING.r * Math.sin(t) * RING.squash;
  const a = (RING.tilt * Math.PI) / 180;
  return { x: RING.cx + x * Math.cos(a) - y * Math.sin(a), y: RING.cy + x * Math.sin(a) + y * Math.cos(a) };
}
const f = (n: number) => n.toFixed(1);

const RIB_ANGLES = [180, 198, 216, 234, 252, 270, 288, 306, 324, 342, 360];
const RIBS = RIB_ANGLES.map(angle => {
  const p = ringPoint(angle);
  const c1 = { x: p.x + (KEYSTONE.x - p.x) * 0.18, y: p.y - 100 };
  const c2 = { x: KEYSTONE.x + (p.x - KEYSTONE.x) * 0.34, y: KEYSTONE.y + 28 };
  return `M${f(p.x)} ${f(p.y)} C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${KEYSTONE.x} ${KEYSTONE.y}`;
});
const CANOPY_MEMBRANE = (() => {
  const first = ringPoint(180);
  const last = ringPoint(360);
  const rear = RIB_ANGLES.map(angle => ringPoint(angle)).map(p => `L${f(p.x)} ${f(p.y)}`).join(' ');
  return `M${KEYSTONE.x} ${KEYSTONE.y} C${KEYSTONE.x - 60} ${KEYSTONE.y + 20} ${f(first.x + 40)} ${f(first.y - 90)} ${f(first.x)} ${f(first.y)} ${rear} C${f(last.x - 40)} ${f(last.y - 90)} ${KEYSTONE.x + 60} ${KEYSTONE.y + 20} ${KEYSTONE.x} ${KEYSTONE.y} Z`;
})();
/** Horizontal lattice rings of the canopy, as ellipses between the ring and the keystone. */
const LATTICE = [
  { cx: 404, cy: 176, rx: 168, ry: 46 },
  { cx: 403, cy: 122, rx: 92, ry: 24 },
];

// Figure geometry. Limbs are chrome tubes (stacked strokes); plates are filled paths.
type Tube = { key: string; from: [number, number]; to: [number, number]; width: number; rim: 'cyan' | 'coral' | 'none' };
const TUBES: Tube[] = [
  { key: 'neck', from: [402, 190], to: [402, 212], width: 16, rim: 'none' },
  { key: 'thigh-r', from: [422, 436], to: [448, 556], width: 30, rim: 'coral' },
  { key: 'shin-r', from: [448, 556], to: [458, 674], width: 22, rim: 'coral' },
  { key: 'thigh-l', from: [382, 436], to: [326, 544], width: 30, rim: 'cyan' },
  { key: 'shin-l', from: [326, 544], to: [350, 674], width: 22, rim: 'cyan' },
  { key: 'arm-up-l', from: [338, 232], to: [270, 190], width: 26, rim: 'cyan' },
  { key: 'arm-fore-l', from: [270, 190], to: [222, 166], width: 20, rim: 'cyan' },
  { key: 'arm-up-r', from: [466, 232], to: [518, 326], width: 26, rim: 'coral' },
  { key: 'arm-fore-r', from: [518, 326], to: [530, 418], width: 20, rim: 'coral' },
];
const FINGERS: [number, number, number, number][] = [
  [214, 154, 198, 128], [208, 160, 190, 150], [212, 168, 200, 180], [224, 172, 232, 186],
  [548, 424, 564, 408], [552, 432, 572, 430], [548, 440, 566, 452], [526, 424, 518, 410],
];
const PALMS = ['214,154 228,158 232,172 220,180 208,174 206,162', '524,420 546,418 556,432 546,446 528,448 520,436'];
const JOINTS: [number, number, number][] = [
  [338, 232, 15], [466, 232, 15], [270, 190, 11], [518, 326, 11], [222, 166, 8], [530, 418, 8], [448, 556, 13], [326, 544, 13],
];
const TORSO = 'M338 216 C362 208 442 208 466 216 C476 244 470 286 458 314 C446 342 428 358 420 374 L384 374 C376 358 358 342 346 314 C334 286 328 244 338 216 Z';
const TORSO_EDGE_L = 'M338 216 C328 244 334 286 346 314 C358 342 376 358 384 374';
const TORSO_EDGE_R = 'M466 216 C476 244 470 286 458 314 C446 342 428 358 420 374';
const ABDOMEN = 'M386 374 L418 374 L416 402 L388 402 Z';
const PELVIS = 'M372 402 L432 402 C446 404 448 424 440 442 L402 464 L364 442 C356 424 358 404 372 402 Z';
const MANTLE_L = 'M336 226 C310 210 284 200 258 196 C276 218 300 232 324 244 Z';
const MANTLE_R = 'M468 226 C494 210 520 200 546 196 C528 218 504 232 480 244 Z';
const FOOT_R = 'M438 666 L480 666 L502 688 L494 696 L428 696 Z';
const FOOT_L = 'M324 666 L366 666 L380 688 L372 696 L308 696 Z';
const HEAD = '402,92 438,112 440,160 416,188 388,188 364,160 366,112';
const HEAD_FACET = '366,112 402,92 402,134 372,136';
const VISOR = '372,134 434,122 436,140 374,152';
const GLASS = '374,232 430,232 426,318 402,336 378,318';
const PRISM = '402,250 424,284 402,318 380,284';
const CONDUIT = 'M402 284 C392 250 366 236 338 232 C308 226 286 200 270 190 C254 180 238 170 222 166';
const ARCH = 'M100 760 V360 A300 300 0 0 1 700 360 V760 Z';
const SKYLINE = '100,760 100,640 126,640 126,612 150,612 150,634 176,634 176,596 190,596 190,584 200,584 200,626 232,626 232,606 258,606 258,642 290,642 290,618 316,618 316,590 328,590 328,574 334,574 334,624 360,624 360,636 394,636 394,600 424,600 424,628 452,628 452,610 478,610 478,644 506,644 506,616 540,616 540,588 552,588 552,576 560,576 560,624 588,624 588,638 616,638 616,608 640,608 640,632 668,632 668,646 700,646 700,760';
const STARS: [number, number, number][] = [
  [150, 300, 1.4], [188, 214, 1], [236, 118, 1.6], [300, 92, 1.1], [352, 74, 1.5], [452, 70, 1.2], [520, 96, 1.7], [590, 150, 1.1],
  [640, 250, 1.5], [672, 330, 1], [134, 420, 1.2], [162, 520, 1.6], [668, 470, 1.3], [640, 560, 1], [222, 300, 0.9], [560, 210, 1],
  [480, 130, 0.9], [300, 170, 1.2], [618, 400, 1.1], [124, 360, 0.9], [206, 470, 1], [660, 610, 1.2], [256, 560, 0.9], [590, 520, 1.3],
];
const SATELLITES = [
  { key: 'a', radius: RING.r + 26, seconds: 18, delay: -4, size: 5 },
  { key: 'b', radius: RING.r + 40, seconds: 21, delay: -13, size: 4 },
  { key: 'c', radius: RING.r + 18, seconds: 24, delay: -9, size: 4.5 },
];

export default function PraxisCouncilRobot({ className = '' }: RobotProps) {
  const id = `afterimage-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(value => !value);
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
    svg.style.setProperty('--af-px', x.toFixed(3));
    svg.style.setProperty('--af-py', y.toFixed(3));
  };
  const onPointerLeave = () => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.style.setProperty('--af-px', '0');
    svg.style.setProperty('--af-py', '0');
  };

  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const chrome = `url(#${id}-chrome)`;
  const R = `.${id}`;
  const ease = 'cubic-bezier(.2,.8,.2,1)';
  const css = `
${R}{--af-open:0;--af-px:0;--af-py:0;--af-field:#100c24;--af-haze:#30204d;--af-rim:rgba(238,245,255,.16);--af-stars:1;--af-sky:#3a2c68;--af-sky-2:#261c4a;--af-rail:#7a68c4;--af-c-top:#eef5ff;--af-c-top2:#b9c5da;--af-c-band:#10141e;--af-c-ground:#737f98;--af-c-low:#2a3142;--af-c-edge:#0b0e16;--af-spec:#ffffff;--af-glass:rgba(6,5,14,.8);--af-visor:#a4f4ff;--af-cyan:#69e5f2;--af-coral:#ff688f;--af-sp1:#ff688f;--af-sp2:#ffa66b;--af-sp3:#ffe18a;--af-sp4:#8bdfc1;--af-sp5:#69e5f2;--af-sp6:#9da6ff;--af-sp7:#d69aff;--af-glow:.5;--af-caustic:.3;--af-blend:screen;--af-shadow:rgba(0,0,0,.55);--af-head:#0a0b12;--af-head-edge:#3a4152;--af-track:rgba(255,255,255,.5);--af-core:.9}
:root[data-theme="light"] ${R}{--af-field:#eeeaf3;--af-haze:#d5ccdf;--af-rim:rgba(23,27,42,.18);--af-stars:0;--af-sky:#b3aac9;--af-sky-2:#c6bed8;--af-rail:#7d6fae;--af-c-top:#8a95aa;--af-c-top2:#5e6980;--af-c-band:#0e1118;--af-c-ground:#3c4557;--af-c-low:#171b2a;--af-c-edge:#0a0c14;--af-spec:#ffffff;--af-glass:rgba(14,10,26,.86);--af-visor:#13a9c2;--af-cyan:#137e94;--af-coral:#bb355f;--af-sp1:#bb355f;--af-sp2:#aa591f;--af-sp3:#8c701b;--af-sp4:#26785b;--af-sp5:#137e94;--af-sp6:#505cb5;--af-sp7:#8847b0;--af-caustic:.7;--af-blend:normal;--af-shadow:rgba(30,20,60,.35);--af-head:#0b0c12;--af-head-edge:#4b5366;--af-track:rgba(23,27,42,.45);--af-core:.5;--af-glow:.22}
${R}.is-open{--af-open:1}
${R}{cursor:pointer;outline:none}
${R} .v{transition:stop-color .4s ease,fill .4s ease,stroke .4s ease,opacity .4s ease}
${R} .s-field{stop-color:var(--af-field)}${R} .s-haze{stop-color:var(--af-haze)}
${R} .s-top{stop-color:var(--af-c-top)}${R} .s-top2{stop-color:var(--af-c-top2)}${R} .s-band{stop-color:var(--af-c-band)}${R} .s-ground{stop-color:var(--af-c-ground)}${R} .s-low{stop-color:var(--af-c-low)}
${R} .s-cyan{stop-color:var(--af-cyan)}${R} .s-coral{stop-color:var(--af-coral)}
${R} .s-sp1{stop-color:var(--af-sp1)}${R} .s-sp2{stop-color:var(--af-sp2)}${R} .s-sp3{stop-color:var(--af-sp3)}${R} .s-sp4{stop-color:var(--af-sp4)}${R} .s-sp5{stop-color:var(--af-sp5)}${R} .s-sp6{stop-color:var(--af-sp6)}${R} .s-sp7{stop-color:var(--af-sp7)}
${R} .field{transform:translate(calc(var(--af-px) * -4px),calc(var(--af-py) * -3px));transition:transform .5s ease-out}
${R} .stars{opacity:var(--af-stars);transform:translate(calc(var(--af-px) * -8px),calc(var(--af-py) * -5px));transition:transform .5s ease-out,opacity .4s ease}
${R} .star{fill:#fff;animation:${id}-twinkle 5.2s ease-in-out infinite}
${R} .ring-rear{transform:translate(calc(var(--af-px) * 6px),calc(var(--af-py) * 4px));transition:transform .5s ease-out}
${R} .ring-front{transform:translate(calc(var(--af-px) * 10px),calc(var(--af-py) * 6px));transition:transform .5s ease-out}
${R} .figure{transform:translate(calc(var(--af-px) * 3px),calc(var(--af-py) * 2px));transition:transform .5s ease-out}
${R} .rock{transform-origin:${RING.cx}px ${RING.cy}px;animation:${id}-rock 28s ease-in-out infinite}
${R} .arch-rim{stroke:var(--af-rim)}
${R} .sky{fill:var(--af-sky)}${R} .sky-2{fill:var(--af-sky-2)}${R} .rail{stroke:var(--af-rail)}
${R} .window{stroke:var(--af-cyan);opacity:.5}${R} .window-warm{stroke:var(--af-coral);opacity:.38}
${R} .shadow{fill:var(--af-shadow)}
${R} .caustic{opacity:calc(var(--af-caustic) + var(--af-open) * .22);mix-blend-mode:var(--af-blend);transition:opacity .6s ease}
${R} .plate{fill:${chrome}}
${R} .plate-round{fill:url(#${id}-round);mix-blend-mode:multiply;opacity:.55}
${R} .seam{fill:none;stroke:var(--af-c-edge);stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round;opacity:.85}
${R} .edge-cyan{fill:none;stroke:var(--af-cyan);stroke-width:2;stroke-linecap:round;opacity:.85}
${R} .edge-coral{fill:none;stroke:var(--af-coral);stroke-width:2;stroke-linecap:round;opacity:.8}
${R} .t-edge{fill:none;stroke:var(--af-c-edge);stroke-linecap:round}
${R} .t-chrome{fill:none;stroke:${chrome};stroke-linecap:round}
${R} .t-spec{fill:none;stroke:var(--af-spec);stroke-linecap:round;opacity:.85}
${R} .t-rim-cyan{fill:none;stroke:var(--af-cyan);stroke-linecap:round;opacity:.85}
${R} .t-rim-coral{fill:none;stroke:var(--af-coral);stroke-linecap:round;opacity:.8}
${R} .joint{fill:url(#${id}-joint)}
${R} .joint-ring{fill:none;stroke:var(--af-cyan);stroke-width:1.2;opacity:.6}
${R} .head{fill:var(--af-head);stroke:var(--af-head-edge);stroke-width:1.4;stroke-linejoin:round}
${R} .head-facet{fill:#fff;opacity:.07}
${R} .facet{fill:none;stroke:var(--af-head-edge);stroke-width:1;opacity:.8}
${R} .visor{fill:var(--af-visor)}
${R} .visor-glow{fill:var(--af-visor);opacity:calc(.26 + var(--af-open) * .3);transition:opacity .5s ease}
${R} .visor-scan{fill:#fff;opacity:.85;animation:${id}-scan 14s ease-in-out infinite}
${R} .glass{fill:var(--af-glass);stroke:var(--af-cyan);stroke-width:1;stroke-opacity:.55}
${R} .prism{fill:url(#${id}-prism);transform-box:fill-box;transform-origin:center;animation:${id}-prism 14s ease-in-out infinite}
${R} .prism-glow{fill:var(--af-cyan);opacity:.35;transform-box:fill-box;transform-origin:center;animation:${id}-pulse 14s ease-in-out infinite}
${R} .prism-edge{fill:none;stroke:#fff;stroke-width:.8;opacity:.8}
${R} .conduit-base{fill:none;stroke:var(--af-cyan);stroke-width:1.2;opacity:.28}
${R} .conduit{fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-dasharray:14 100;stroke-dashoffset:114;opacity:0;animation:${id}-travel 14s linear infinite}
${R} .conduit-halo{fill:none;stroke:var(--af-cyan);stroke-width:9;stroke-linecap:round;stroke-dasharray:14 100;stroke-dashoffset:114;opacity:0;animation:${id}-travel-halo 14s linear infinite}
${R} .spin{animation:${id}-spin 48s linear infinite}
${R} .spin-fast{animation:${id}-spin 22s linear infinite}
${R} .spin-back{animation:${id}-spin 90s linear infinite reverse}
${R} .ghost{fill:none;stroke:var(--af-track);stroke-width:1;opacity:.35}
${R} .track{fill:none;stroke:var(--af-track);stroke-width:1.3;stroke-dasharray:5 7;opacity:.6}
${R} .seg{fill:none;stroke:url(#${id}-spectrum);stroke-width:10;stroke-dasharray:30 15;transition:stroke-dasharray .9s ${ease}}
${R} .seg-glow{fill:none;stroke:url(#${id}-spectrum);stroke-width:30;stroke-dasharray:30 15;opacity:var(--af-glow);mix-blend-mode:var(--af-blend);transition:stroke-dasharray .9s ${ease},opacity .4s ease;animation:${id}-settle 14s ease-in-out infinite}
${R} .seg-core{fill:none;stroke:#fff;stroke-width:2.4;stroke-dasharray:30 15;opacity:var(--af-core);transition:stroke-dasharray .9s ${ease}}
${R} .seg-head{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-dasharray:3 42;opacity:.9;transition:opacity .6s ease}
${R}.is-open .seg,${R}.is-open .seg-glow,${R}.is-open .seg-core{stroke-dasharray:360 0;transition-duration:1.2s}
${R}.is-open .seg-head{opacity:0}
${R} .satellite{fill:#fff}
${R} .satellite-glow{fill:var(--af-cyan);opacity:.55}
${R} .satellites{transition:opacity .9s ease;opacity:calc(1 - var(--af-open))}
${R} .orbit-pulse{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-dasharray:36 324;stroke-dashoffset:150;opacity:0;animation:${id}-orbit 14s linear infinite}
${R} .orbit-halo{fill:none;stroke:var(--af-cyan);stroke-width:18;stroke-linecap:round;stroke-dasharray:36 324;stroke-dashoffset:150;opacity:0;animation:${id}-orbit-halo 14s linear infinite}
${R} .rib{fill:none;stroke:url(#${id}-canopy);stroke-width:2.8;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:calc(100 * (1 - var(--af-open)));transition:stroke-dashoffset .9s ${ease}}
${R}.is-open .rib{transition-duration:1.2s}
${R} .rib-glow{fill:none;stroke:url(#${id}-canopy);stroke-width:11;stroke-linecap:round;opacity:calc(var(--af-open) * .32);mix-blend-mode:var(--af-blend);transition:opacity .9s ease}
${R} .lattice{fill:none;stroke:url(#${id}-canopy);stroke-width:1.6;stroke-dasharray:100;stroke-dashoffset:calc(100 * (1 - var(--af-open)));opacity:.8;transition:stroke-dashoffset 1.2s ${ease} .3s}
${R} .membrane{fill:url(#${id}-canopy);opacity:calc(var(--af-open) * .2);mix-blend-mode:var(--af-blend);transition:opacity 1.2s ease}
${R} .keystone{fill:#fff;opacity:var(--af-open);transform-box:fill-box;transform-origin:center;transform:scale(calc(.4 + var(--af-open) * .6));transition:opacity .8s ease .5s,transform .8s ${ease} .5s}
${R} .keystone-glow{fill:var(--af-cyan);opacity:calc(var(--af-open) * .5);transition:opacity 1s ease .5s}
@keyframes ${id}-spin{to{transform:rotate(360deg)}}
@keyframes ${id}-rock{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes ${id}-twinkle{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes ${id}-travel{0%,21%{stroke-dashoffset:114;opacity:0}23%{opacity:1}50%{stroke-dashoffset:-14;opacity:1}52%,100%{stroke-dashoffset:-14;opacity:0}}
@keyframes ${id}-travel-halo{0%,21%{stroke-dashoffset:114;opacity:0}23%{opacity:.45}50%{stroke-dashoffset:-14;opacity:.45}52%,100%{stroke-dashoffset:-14;opacity:0}}
@keyframes ${id}-orbit{0%,50%{stroke-dashoffset:150;opacity:0}52%{opacity:1}78%{opacity:1}80%,100%{stroke-dashoffset:-210;opacity:0}}
@keyframes ${id}-orbit-halo{0%,50%{stroke-dashoffset:150;opacity:0}52%{opacity:.5}78%{opacity:.5}80%,100%{stroke-dashoffset:-210;opacity:0}}
@keyframes ${id}-settle{0%,100%{opacity:var(--af-glow)}79%{opacity:calc(var(--af-glow) + .3)}92%{opacity:var(--af-glow)}}
@keyframes ${id}-pulse{0%,100%{opacity:.3;transform:scale(1)}12%{opacity:.95;transform:scale(1.4)}21%{opacity:.6;transform:scale(1.08)}30%{opacity:.35;transform:scale(1)}}
@keyframes ${id}-prism{0%,100%{transform:rotate(0deg)}50%{transform:rotate(180deg)}}
@keyframes ${id}-scan{0%,100%{transform:translate(0,0)}50%{transform:translate(42px,-7px)}}`;

  const tube = ({ key, from, to, width, rim }: Tube) => {
    const line = { x1: from[0], y1: from[1], x2: to[0], y2: to[1] };
    return (
      <g key={key}>
        <line {...line} strokeWidth={width} className="t-edge" />
        <line {...line} strokeWidth={width - 5} className="t-chrome" />
        <line {...line} strokeWidth={Math.max(2, (width - 5) * 0.28)} className="t-spec" transform={`translate(${-width * 0.16} ${-width * 0.14})`} />
        {rim === 'cyan' && <line {...line} strokeWidth={1.6} className="t-rim-cyan" transform={`translate(${-width * 0.4} ${-width * 0.3})`} />}
        {rim === 'coral' && <line {...line} strokeWidth={1.6} className="t-rim-coral" transform={`translate(${width * 0.38} ${width * 0.3})`} />}
      </g>
    );
  };
  const plate = (d: string, key: string) => (
    <g key={key}>
      <path d={d} className="plate" />
      <path d={d} className="plate-round" />
    </g>
  );

  const ringLayer = (clip: string, className: string) => (
    <g className={className} clipPath={clip}>
      <g className="rock">
        <g transform={`translate(${RING.cx} ${RING.cy}) rotate(${RING.tilt}) scale(1 ${RING.squash})`}>
          <circle r={RING.r} className="ghost" />
          <g className="spin-back"><circle r={RING.r - 20} pathLength={360} className="track" /></g>
          <g className="spin">
            <circle r={RING.r} pathLength={360} className="seg-glow" />
            <circle r={RING.r} pathLength={360} className="seg" />
            <circle r={RING.r} pathLength={360} className="seg-core" />
          </g>
          <g className="spin-fast"><circle r={RING.r} pathLength={360} className="seg-head" /></g>
          <g className="satellites">
            {SATELLITES.map(satellite => (
              <g key={satellite.key} className="spin" style={{ animationDuration: `${satellite.seconds}s`, animationDelay: `${satellite.delay}s` }}>
                <g transform={`translate(${satellite.radius} 0)`}>
                  <circle r={satellite.size * 2.6} className="satellite-glow" />
                  <circle r={satellite.size} className="satellite" />
                </g>
              </g>
            ))}
          </g>
          <circle r={RING.r} pathLength={360} className="orbit-halo" />
          <circle r={RING.r} pathLength={360} className="orbit-pulse" />
        </g>
      </g>
    </g>
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 800"
      role="img"
      tabIndex={0}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={`${id} w-full h-full ${open ? 'is-open' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      onClick={toggle}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>Afterimage, the Night Architect</title>
      <desc id={descId}>
        A tall chrome robot stands inside a violet arch above a compressed future New York. One raised hand conducts a broken ring of light carriers that orbits behind its shoulders and returns across its waist into its other, upturned hand. A pulse leaves the prism in its chest, runs up the conducting arm and travels around the ring. Click or tap to close the ring and raise a luminous canopy behind the figure; click again to release it.
      </desc>
      <style>{css}</style>

      <defs>
        <clipPath id={`${id}-clip-arch`}><path d={ARCH} /></clipPath>
        <clipPath id={`${id}-clip-rear`}>
          <rect x={RING.cx - 460} y={RING.cy - 480} width={920} height={480} transform={`rotate(${RING.tilt} ${RING.cx} ${RING.cy})`} />
        </clipPath>
        <clipPath id={`${id}-clip-front`}>
          <rect x={RING.cx - 460} y={RING.cy} width={920} height={480} transform={`rotate(${RING.tilt} ${RING.cx} ${RING.cy})`} />
        </clipPath>
        <radialGradient id={`${id}-field`} gradientUnits="userSpaceOnUse" cx={400} cy={330} r={440}>
          <stop offset="0" className="s-haze v" />
          <stop offset="1" className="s-field v" />
        </radialGradient>
        <linearGradient id={`${id}-chrome`} gradientUnits="userSpaceOnUse" x1={0} y1={90} x2={0} y2={700}>
          <stop offset="0" className="s-top v" />
          <stop offset="0.1" className="s-top2 v" />
          <stop offset="0.27" className="s-top2 v" />
          <stop offset="0.44" className="s-top v" />
          <stop offset="0.458" className="s-band v" />
          <stop offset="0.512" className="s-band v" />
          <stop offset="0.515" className="s-ground v" />
          <stop offset="0.7" className="s-ground v" />
          <stop offset="0.704" className="s-low v" />
          <stop offset="1" className="s-low v" />
        </linearGradient>
        <linearGradient id={`${id}-round`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.55} />
          <stop offset="0.2" stopColor="#000" stopOpacity={0} />
          <stop offset="0.46" stopColor="#000" stopOpacity={0} />
          <stop offset="0.5" stopColor="#000" stopOpacity={0.45} />
          <stop offset="0.53" stopColor="#000" stopOpacity={0} />
          <stop offset="0.8" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.6} />
        </linearGradient>
        <radialGradient id={`${id}-joint`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" className="s-top v" />
          <stop offset="0.45" className="s-ground v" />
          <stop offset="1" className="s-low v" />
        </radialGradient>
        <linearGradient id={`${id}-prism`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#bdf6ff" />
          <stop offset="1" stopColor="#7d8cff" />
        </linearGradient>
        <linearGradient id={`${id}-spectrum`} gradientUnits="userSpaceOnUse" x1={-RING.r} y1={0} x2={RING.r} y2={0}>
          {[1, 2, 3, 4, 5, 6, 7].map(index => <stop key={index} offset={(index - 1) / 6} className={`s-sp${index} v`} />)}
        </linearGradient>
        <linearGradient id={`${id}-canopy`} gradientUnits="userSpaceOnUse" x1={0} y1={60} x2={0} y2={400}>
          {[1, 2, 3, 4, 5, 6, 7].map(index => <stop key={index} offset={(index - 1) / 6} className={`s-sp${index} v`} />)}
        </linearGradient>
        <radialGradient id={`${id}-caustic`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" className="s-cyan v" stopOpacity={0.9} />
          <stop offset="0.5" className="s-coral v" stopOpacity={0.45} />
          <stop offset="1" className="s-coral v" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Arch of violet night */}
      <g className="field">
        <path d={ARCH} fill={`url(#${id}-field)`} />
        <g className="stars">
          {STARS.map(([cx, cy, r], index) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} className="star" style={{ animationDelay: `${-((index * 1.7) % 5.2)}s` }} />)}
        </g>
        <g clipPath={`url(#${id}-clip-arch)`}>
          <polygon points={SKYLINE} className="sky v" />
          <polygon points="100,760 100,660 220,660 240,650 330,650 350,662 470,662 500,652 580,652 610,664 700,664 700,760" className="sky-2 v" />
          <line x1={100} y1={588} x2={700} y2={588} className="rail" strokeWidth={2} opacity={0.7} />
          <line x1={100} y1={594} x2={700} y2={594} className="rail" strokeWidth={1} opacity={0.45} />
          <line x1={110} y1={604} x2={700} y2={604} className="window" strokeWidth={1.4} strokeDasharray="2 9" />
          <line x1={104} y1={622} x2={700} y2={622} className="window-warm" strokeWidth={1.4} strokeDasharray="2 13" />
          <line x1={118} y1={640} x2={700} y2={640} className="window" strokeWidth={1.2} strokeDasharray="2 17" />
        </g>
        <path d={ARCH} fill="none" strokeWidth={2} className="arch-rim v" />
      </g>

      {/* Floor light and shadow */}
      <ellipse cx={400} cy={700} rx={262} ry={20} fill={`url(#${id}-caustic)`} className="caustic" />
      <ellipse cx={404} cy={696} rx={110} ry={8} className="shadow v" />

      {/* Canopy, raised behind the figure when the ring closes */}
      <g className="canopy">
        <path d={CANOPY_MEMBRANE} className="membrane" />
        {RIBS.map((d, index) => <path key={`glow-${index}`} d={d} className="rib-glow" />)}
        {RIBS.map((d, index) => <path key={`rib-${index}`} d={d} pathLength={100} className="rib" style={{ transitionDelay: `${index * 0.06}s` }} />)}
        {LATTICE.map(ellipse => <ellipse key={ellipse.cy} {...ellipse} pathLength={100} className="lattice" />)}
        <circle cx={KEYSTONE.x} cy={KEYSTONE.y} r={18} className="keystone-glow" />
        <polygon points={`${KEYSTONE.x},${KEYSTONE.y - 9} ${KEYSTONE.x + 7},${KEYSTONE.y} ${KEYSTONE.x},${KEYSTONE.y + 9} ${KEYSTONE.x - 7},${KEYSTONE.y}`} className="keystone" />
      </g>

      {/* Ring, rear half */}
      {ringLayer(`url(#${id}-clip-rear)`, 'ring-rear')}

      {/* The figure */}
      <g className="figure">
        {plate(MANTLE_L, 'mantle-l')}
        {plate(MANTLE_R, 'mantle-r')}
        {TUBES.filter(t => t.key.startsWith('thigh') || t.key.startsWith('shin') || t.key === 'neck').map(tube)}
        {plate(FOOT_L, 'foot-l')}
        {plate(FOOT_R, 'foot-r')}
        <path d="M312 690 H372 M432 690 H494" className="seam" />
        {plate(PELVIS, 'pelvis')}
        <path d="M402 404 V462" className="seam" />
        {plate(ABDOMEN, 'abdomen')}
        <path d="M388 382 H416 M388 390 H416 M388 398 H416" className="seam" />
        {plate(TORSO, 'torso')}
        <path d="M382 216 L402 238 L422 216" className="seam" />
        <path d="M350 254 C372 266 392 266 402 254 M454 254 C432 266 412 266 402 254" className="seam" />
        <path d="M344 290 L356 304 M338 268 L350 282 M460 290 L448 304 M466 268 L454 282" className="seam" />
        <path d={TORSO_EDGE_L} className="edge-cyan" />
        <path d={TORSO_EDGE_R} className="edge-coral" />
        <path d="M336 226 C310 210 284 200 258 196" className="edge-cyan" />
        <path d="M468 226 C494 210 520 200 546 196" className="edge-coral" />

        {/* Smoked glass chest with the prism */}
        <polygon points={GLASS} className="glass v" />
        <path d="M380 248 L402 260 L424 248 M402 260 V320" className="conduit-base" />
        <circle cx={402} cy={284} r={22} className="prism-glow" />
        <polygon points={PRISM} className="prism" />
        <path d="M402 250 L402 318 M380 284 L424 284" className="prism-edge" />

        {/* Arms and hands */}
        {TUBES.filter(t => t.key.startsWith('arm')).map(tube)}
        {PALMS.map((points, index) => (
          <g key={`palm-${index}`}>
            <polygon points={points} className="plate" stroke="var(--af-c-edge)" strokeWidth={1.2} strokeLinejoin="round" />
          </g>
        ))}
        {FINGERS.map(([x1, y1, x2, y2]) => (
          <g key={`${x1}-${y1}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={6} className="t-edge" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={3.4} className="t-chrome" />
          </g>
        ))}

        {/* Joints */}
        {JOINTS.map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={r} className="joint" />
            <circle cx={cx} cy={cy} r={r * 0.62} className="joint-ring" />
          </g>
        ))}

        {/* Head */}
        <polygon points={HEAD} className="head" />
        <polygon points={HEAD_FACET} className="head-facet" />
        <path d="M402 92 L402 188 M438 112 L410 140 M366 112 L394 140" className="facet" />
        <polygon points={VISOR} className="visor-glow" transform="translate(-1.6 -.6) scale(1.04)" />
        <polygon points={VISOR} className="visor" />
        <rect x={376} y={131} width={10} height={16} rx={2} className="visor-scan" />

        {/* Light conducted up the arm */}
        <path d={CONDUIT} pathLength={100} className="conduit-halo" />
        <path d={CONDUIT} pathLength={100} className="conduit" />
      </g>

      {/* Ring, front half */}
      {ringLayer(`url(#${id}-clip-front)`, 'ring-front')}
    </svg>
  );
}
