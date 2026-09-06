'use client';

import React, { useId } from 'react';

/**
 * The Open Seat — GPT-6, created in Codex desktop. Exact model snapshot unknown.
 * A public-service automaton makes room by becoming a bench. Stillness is part
 * of the invitation; only the eye glances and blinks, without user input.
 */
export default function Gpt6Robot({ className = '' }: { className?: string }) {
  const id = `open-seat-${useId()}`;
  const resource = (name: string) => `url(#${id}-${name})`;
  const seatColors = ['#df7369', '#edaa60', '#efcd76', '#84ad8b', '#73aabb', '#a48eb6'];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      width="100%"
      height="100%"
      className={className}
      data-open-seat={id}
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      focusable="false"
    >
      <title id={`${id}-title`}>The Open Seat</title>
      <desc id={`${id}-desc`}>
        A brass and teal robot has unfolded its body into a park bench. Six
        rainbow slats make an empty seat beside its tilted, luminous eye.
        One articulated hand opens in welcome; a tiny flower grows by its feet.
        Against a round dusk sky, the words read: Stay a while. An interpretation
        of intelligence as hospitality, made for a queer community in New York.
      </desc>
      <style>{`
        [data-open-seat="${id}"] {
          --os-sky: #343238;
          --os-orbit: #706368;
          --os-ground: #242e31;
          --os-caption: #eedbbc;
          --os-muted: #bbaba0;
          display: block;
          isolation: isolate;
        }
        :root[data-theme="light"] [data-open-seat="${id}"] {
          --os-sky: #e8d8c4;
          --os-orbit: #b8a48f;
          --os-ground: #d5d5c8;
          --os-caption: #304444;
          --os-muted: #6b6860;
        }
        [data-open-seat="${id}"] .os-pupil {
          animation: gpt6-open-seat-glance 12s ease-in-out infinite;
        }
        [data-open-seat="${id}"] .os-lid {
          transform: translateY(-90px);
          animation: gpt6-open-seat-blink 9s ease-in-out infinite;
        }
        @keyframes gpt6-open-seat-glance {
          0%, 24%, 78%, 100% { transform: translate(0, 0); }
          35%, 58% { transform: translate(-9px, -3px); }
        }
        @keyframes gpt6-open-seat-blink {
          0%, 72%, 77%, 100% { transform: translateY(-90px); }
          74%, 75% { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-open-seat="${id}"] .os-pupil,
          [data-open-seat="${id}"] .os-lid { animation: none; }
        }
      `}</style>
      <defs>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="0.7">
          <stop stopColor="#f2d9a0" />
          <stop offset="0.42" stopColor="#d6b475" />
          <stop offset="1" stopColor="#ad7950" />
        </linearGradient>
        <linearGradient id={`${id}-enamel`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#719d99" />
          <stop offset="0.48" stopColor="#426e6d" />
          <stop offset="1" stopColor="#2a4548" />
        </linearGradient>
        <radialGradient id={`${id}-lens`} cx="0.38" cy="0.32" r="0.7">
          <stop stopColor="#fff8d4" />
          <stop offset="0.55" stopColor="#f0d18b" />
          <stop offset="1" stopColor="#cc935b" />
        </radialGradient>
        <pattern id={`${id}-grain`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(22)">
          <path d="M0 0V8" stroke="#fff4d2" strokeWidth="0.7" opacity="0.17" />
        </pattern>
        <clipPath id={`${id}-sky-clip`}>
          <circle cx="326" cy="291" r="223" />
        </clipPath>
        <clipPath id={`${id}-eye-clip`}>
          <ellipse cx="261" cy="182" rx="28" ry="33" transform="rotate(-15 261 182)" />
        </clipPath>
      </defs>

      {/* A quiet, print-like dusk disc, with a horizon that follows the seat. */}
      <circle cx="326" cy="291" r="223" fill="var(--os-sky)" />
      <g clipPath={resource('sky-clip')} fill="none" stroke="var(--os-orbit)" strokeWidth="1">
        <path d="M63 361L563 202M69 384L569 225M81 407L581 248" opacity="0.38" />
        <circle cx="326" cy="291" r="207" strokeDasharray="1 9" />
        <path d="M395 86A219 219 0 0 1 539 237" strokeWidth="3" />
      </g>
      <g fill="var(--os-muted)" fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="3">
        <text x="95" y="94">NYC / COMMON GROUND</text>
        <text x="538" y="516" transform="rotate(-90 538 516)">EVERY BODY WELCOME</text>
      </g>
      <path d="M473 133v26m-13-13h26" stroke="#dcb67f" strokeWidth="2" />
      <circle cx="443" cy="115" r="3" fill="#dcb67f" />
      <circle cx="506" cy="190" r="2.5" fill="#dcb67f" />

      {/* Feet and four grounded, hinged supports. */}
      <ellipse cx="323" cy="515" rx="205" ry="30" fill="var(--os-ground)" />
      <ellipse cx="338" cy="515" rx="144" ry="13" fill="#142c30" opacity="0.17" />
      <g stroke="#273c3c" strokeWidth="3" strokeLinejoin="round">
        <path d="M276 400l-2 53-27 30 9 11 42-29 8-56Z" fill="#8e704f" />
        <path d="M448 355l19 59-7 57 20 2 15-62-20-60Z" fill="#8e704f" />
        <path d="M446 472q16-13 33-7l22 10q8 7-3 12l-52 4q-12-8 0-19Z" fill={resource('enamel')} />
        <path d="M234 483q10-8 24-3l12 10q5 7-3 11l-37 2q-10-7 4-20Z" fill={resource('enamel')} />
        <path d="M215 371l-16 69 21 57 22-6-12-52 20-61Z" fill={resource('brass')} />
        <path d="M342 414l-7 39 30 41-17 14-43-47 7-52Z" fill={resource('brass')} />
        <path d="M215 493q15-8 28 1l21 16q5 8-6 11l-55-2q-10-12 12-26Z" fill={resource('enamel')} />
        <path d="M348 497q12-10 24-3l22 10q9 6 2 12l-51 12q-14-6 3-31Z" fill={resource('enamel')} />
        <circle cx="216" cy="440" r="15" fill="#bf955f" />
        <circle cx="321" cy="454" r="14" fill="#bf955f" />
        <circle cx="216" cy="440" r="6" fill="#355354" />
        <circle cx="321" cy="454" r="5" fill="#355354" />
        <path d="M207 508l37 2m107 4 30-7" stroke="#9bbab0" strokeWidth="2" />
      </g>

      {/* The backrest is an extension of the shoulder, open toward the viewer. */}
      <g stroke="#273c3c" strokeWidth="3" strokeLinejoin="round">
        <path d="M264 300l183-62q14-4 21 12l25 67-190 66Z" fill={resource('brass')} />
        <path d="M285 309l162-54q7-2 10 5l17 46-167 57Z" fill={resource('enamel')} />
        <path d="M297 321l167-56m-158 81 167-56" stroke="#95b2a2" strokeWidth="1.5" opacity="0.75" />
        <path d="M317 299l17 54m24-68 18 54m24-68 18 54m23-68 18 52" stroke="#bda06e" strokeWidth="5" />
        <path d="M304 368l-4 35m175-95 12 48" stroke="#c6a472" strokeWidth="13" />
      </g>

      {/* Each colored slat has a front edge and two little brass fasteners. */}
      <path d="M251 372l195-62 74 69-194 70-75-56Z" fill="#273c3c" stroke="#273c3c" strokeWidth="4" strokeLinejoin="round" />
      {seatColors.map((color, index) => {
        const x = 255 + index * 12;
        const y = 369 + index * 11;
        return (
          <g key={color}>
            <path d={`M${x} ${y + 5}l190-62 10 9v8l-190 65-10-9Z`} fill="#263b3b" />
            <path d={`M${x} ${y}l190-62 10 9-190 65Z`} fill={color} stroke="#2d4443" strokeWidth="1.5" strokeLinejoin="round" />
            <path d={`M${x + 10} ${y + 1}l171-56`} stroke="#fff7d2" strokeWidth="1" opacity="0.43" />
            <circle cx={x + 14} cy={y + 2} r="1.8" fill="#314545" />
            <circle cx={x + 183} cy={y - 53} r="1.8" fill="#314545" />
          </g>
        );
      })}
      <path d="M325 434l194-67v17l-194 69Z" fill="#b99160" stroke="#273c3c" strokeWidth="3" strokeLinejoin="round" />
      <path d="M339 438l167-58" stroke="#f1d39a" strokeWidth="2" />

      {/* The torso doubles as the bench's end: a useful body, not a costume. */}
      <g stroke="#273c3c" strokeWidth="3" strokeLinejoin="round">
        <path d="M211 270q24-11 44 9l37 74-25 53-55-11-29-77Z" fill={resource('brass')} />
        <path d="M211 270q24-11 44 9l37 74-25 53-55-11-29-77Z" fill={resource('grain')} stroke="none" />
        <path d="M204 315l23 66 32 7 17-33-31-60Z" fill={resource('enamel')} />
        <path d="M220 325l26-9m-22 20 28-9m-24 20 28-9" stroke="#a8b9a0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="244" cy="365" r="7" fill="#e8c685" />
        <path d="M241 365h6" strokeWidth="2" />
        <circle cx="211" cy="294" r="22" fill="#a27c53" />
        <circle cx="211" cy="294" r="13" fill="#e0bc7f" />
      </g>

      {/* A palm-up invitation, with no hover-only state. */}
      <g stroke="#273c3c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M204 301l-30 45-42-17-8 17 47 27q12 4 20-8l32-48" fill={resource('brass')} />
        <circle cx="176" cy="355" r="11" fill="#426e6d" />
        <path d="M135 337l-12-15-6-19q-3-8-8-4l2 21-22-12q-7-3-9 2l19 17-25-5q-9 0-8 6l30 14 30 6Z" fill={resource('brass')} />
        <path d="M90 328l19 9 14-1" fill="none" stroke="#866345" strokeWidth="2" />
        <path d="M131 340l8-11" stroke="#e9d095" strokeWidth="2" />
      </g>

      {/* A jointed reading-lamp neck and one attentive, off-center eye. */}
      <path d="M232 276l-8-37 29-25" fill="none" stroke="#273c3c" strokeWidth="28" strokeLinejoin="round" />
      <path d="M232 276l-8-37 29-25" fill="none" stroke="#c8a06b" strokeWidth="19" strokeLinejoin="round" />
      <circle cx="224" cy="239" r="10" fill="#71918a" stroke="#273c3c" strokeWidth="3" />
      <g transform="rotate(12 246 190)" stroke="#273c3c" strokeWidth="3">
        <path d="M160 155q3-16 22-20l92-8q26-1 36 21l15 51q5 23-20 30l-107 17q-19 3-25-17Z" fill={resource('brass')} />
        <path d="M166 154l101-9q24-1 33 20l13 37q4 11-7 17l-110 17q-12 2-16-13Z" fill={resource('enamel')} />
        <path d="M172 154l15 62q3 12 17 11" fill="none" stroke="#a3c0aa" strokeWidth="2" />
        <path d="M166 154l101-9q24-1 33 20" fill="none" stroke="#fae0a6" strokeWidth="3" />
        <ellipse cx="258" cy="184" rx="38" ry="43" fill="#233d40" transform="rotate(-15 258 184)" />
        <ellipse cx="261" cy="182" rx="30" ry="35" fill={resource('lens')} stroke="#c69a64" strokeWidth="4" transform="rotate(-15 261 182)" />
        <g clipPath={resource('eye-clip')}>
          <g className="os-pupil">
            <ellipse cx="270" cy="188" rx="13" ry="21" fill="#2a4849" stroke="none" transform="rotate(-15 270 188)" />
            <ellipse cx="266" cy="178" rx="5" ry="7" fill="#fff8d8" stroke="none" />
          </g>
          <g className="os-lid">
            <path d="M216 135h88v93h-88Z" fill="#517c78" stroke="none" />
            <path d="M228 193q31 15 66-7" fill="none" stroke="#273c3c" strokeWidth="2" />
          </g>
        </g>
        <path d="M192 174l11-2m-8 12 11-2m-8 12 11-2" stroke="#bed0b4" strokeWidth="3" strokeLinecap="round" />
        <path d="M222 218l20-3" stroke="#c4b590" strokeWidth="2" strokeLinecap="round" />
        <circle cx="187" cy="144" r="2" fill="#684f3c" stroke="none" />
        <circle cx="311" cy="214" r="2" fill="#684f3c" stroke="none" />
      </g>
      <path d="M186 139l-14-29" stroke="#273c3c" strokeWidth="7" strokeLinecap="round" />
      <path d="M186 137l-14-27" stroke="#c7a36e" strokeWidth="3" strokeLinecap="round" />
      <circle cx="170" cy="105" r="9" fill="#dd8773" stroke="#273c3c" strokeWidth="3" />

      {/* A small living thing shares the pavement. */}
      <path d="M132 513q8-18 3-35m1 22q-14 0-19-13 15-2 19 13m1-8q15-3 19-14-14-1-19 14" fill="#7fa38e" stroke="#46655e" strokeWidth="2" />
      <g fill="#df8d85">
        <ellipse cx="134" cy="473" rx="5" ry="10" />
        <ellipse cx="134" cy="473" rx="5" ry="10" transform="rotate(60 134 473)" />
        <ellipse cx="134" cy="473" rx="5" ry="10" transform="rotate(120 134 473)" />
      </g>
      <circle cx="134" cy="473" r="4" fill="#efd196" />
      <path d="M94 521h77m291 3h35" stroke="var(--os-orbit)" strokeWidth="1.5" strokeLinecap="round" />

      <g fill="var(--os-caption)" textAnchor="middle">
        <text x="320" y="577" fontFamily="Georgia, 'Times New Roman', serif" fontSize="35" letterSpacing="1">Stay a while.</text>
        <text x="320" y="600" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="3">THE OPEN SEAT / 01</text>
      </g>
    </svg>
  );
}
