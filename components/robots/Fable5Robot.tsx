"use client";

import React, { useEffect, useRef, useState } from 'react';

interface RobotProps {
    className?: string;
}

/**
 * Fable 5 — "The Storyweaver"
 * A bard automaton: quill antenna, an open storybook for a heart,
 * and threads of narrative stitching the night sky together.
 */
export default function Fable5Robot({ className = "" }: RobotProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 3;

            const dirX = (e.clientX - centerX) / (rect.width / 2);
            const dirY = (e.clientY - centerY) / (rect.height / 2);

            const limit = 7;
            setEyePos({
                x: Math.max(-limit, Math.min(limit, dirX * limit)),
                y: Math.max(-limit, Math.min(limit, dirY * limit)),
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <svg
            ref={svgRef}
            viewBox="0 0 400 700"
            role="img"
            aria-labelledby="fable5-title"
            className={`w-full h-full ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <title id="fable5-title">Fable 5 Robot — The Storyweaver</title>

            <style>{`
                @keyframes f5-bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                @keyframes f5-drift { 0% { transform: translate(0, 0) rotate(0deg); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translate(24px, -110px) rotate(28deg); opacity: 0; } }
                @keyframes f5-drift-l { 0% { transform: translate(0, 0) rotate(0deg); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translate(-30px, -125px) rotate(-24deg); opacity: 0; } }
                @keyframes f5-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
                @keyframes f5-quill { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(8deg); } }
                @keyframes f5-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes f5-pageflip { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.12); } }
                @keyframes f5-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.08); } }
                .f5-bob { animation: f5-bob 4.5s ease-in-out infinite; }
                .f5-drift { animation: f5-drift 5s ease-out infinite; }
                .f5-drift-l { animation: f5-drift-l 6s ease-out infinite; }
                .f5-twinkle { animation: f5-twinkle 3s ease-in-out infinite; }
                .f5-quill { animation: f5-quill 3.2s ease-in-out infinite; transform-origin: 200px 62px; }
                .f5-orbit { animation: f5-orbit 14s linear infinite; transform-origin: 200px 330px; }
                .f5-pageflip { animation: f5-pageflip 4s ease-in-out infinite; transform-origin: 200px 330px; }
                .f5-blink { animation: f5-blink 5s ease-in-out infinite; transform-origin: center 138px; }
            `}</style>

            <defs>
                <linearGradient id="f5-ink" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2b2447" />
                    <stop offset="55%" stopColor="#1e1936" />
                    <stop offset="100%" stopColor="#141026" />
                </linearGradient>
                <linearGradient id="f5-clay" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff8a66" />
                    <stop offset="50%" stopColor="#da7756" />
                    <stop offset="100%" stopColor="#b85a3c" />
                </linearGradient>
                <linearGradient id="f5-parchment" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fdf3dd" />
                    <stop offset="100%" stopColor="#ecd9ae" />
                </linearGradient>
                <linearGradient id="f5-pride" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e74c3c" />
                    <stop offset="18%" stopColor="#e67e22" />
                    <stop offset="36%" stopColor="#f1c40f" />
                    <stop offset="54%" stopColor="#2ecc71" />
                    <stop offset="72%" stopColor="#3498db" />
                    <stop offset="88%" stopColor="#9b59b6" />
                    <stop offset="100%" stopColor="#e91e8b" />
                </linearGradient>
                <linearGradient id="f5-pride-v" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e74c3c" />
                    <stop offset="20%" stopColor="#f1c40f" />
                    <stop offset="40%" stopColor="#2ecc71" />
                    <stop offset="60%" stopColor="#3498db" />
                    <stop offset="80%" stopColor="#9b59b6" />
                    <stop offset="100%" stopColor="#e91e8b" />
                </linearGradient>
                <radialGradient id="f5-eye" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stopColor="#fffaf0" />
                    <stop offset="35%" stopColor="#ffc24d" />
                    <stop offset="100%" stopColor="#da7756" />
                </radialGradient>
                <radialGradient id="f5-aura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffc24d" stopOpacity="0.5" />
                    <stop offset="55%" stopColor="#da7756" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <filter id="f5-glow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="f5-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.4" />
                </filter>
            </defs>

            {/* Night-sky story constellation: a plot arc, literally */}
            <g>
                <path
                    d="M40 560 C 90 480, 110 300, 200 250 C 290 200, 320 380, 365 520"
                    fill="none" stroke="#9b59b6" strokeWidth="1.5" strokeDasharray="3 7" opacity="0.35"
                />
                <circle cx="40" cy="560" r="3" fill="#f1c40f" className="f5-twinkle" />
                <circle cx="98" cy="420" r="4" fill="#3498db" className="f5-twinkle" style={{ animationDelay: '0.6s' }} />
                <circle cx="200" cy="250" r="5" fill="#fffaf0" className="f5-twinkle" style={{ animationDelay: '1.2s' }} />
                <circle cx="305" cy="330" r="4" fill="#e91e8b" className="f5-twinkle" style={{ animationDelay: '1.8s' }} />
                <circle cx="365" cy="520" r="3" fill="#2ecc71" className="f5-twinkle" style={{ animationDelay: '2.4s' }} />
            </g>

            {/* Warm aura */}
            <ellipse cx="200" cy="340" rx="175" ry="270" fill="url(#f5-aura)" />

            {/* Floating platform */}
            <g transform="translate(200, 655)">
                <ellipse cx="0" cy="0" rx="125" ry="24" fill="#141026" opacity="0.65" />
                <ellipse cx="0" cy="-7" rx="100" ry="18" fill="none" stroke="url(#f5-pride)" strokeWidth="3" opacity="0.75" />
                <ellipse cx="0" cy="-7" rx="62" ry="11" fill="none" stroke="#da7756" strokeWidth="2" opacity="0.5" />
            </g>

            {/* ====== ROBOT (gently bobbing) ====== */}
            <g className="f5-bob">

                {/* LEGS */}
                <g filter="url(#f5-shadow)">
                    <path d="M152 445 L143 525 L134 585 L172 585 L177 525 L172 445 Z"
                          fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    <path d="M248 445 L257 525 L266 585 L228 585 L223 525 L228 445 Z"
                          fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    {/* Gilded knee clasps, like book corners */}
                    <path d="M140 505 L168 505 L168 517 L140 517 Z" fill="url(#f5-clay)" rx="2" opacity="0.85" />
                    <path d="M232 505 L260 505 L260 517 L232 517 Z" fill="url(#f5-clay)" opacity="0.85" />
                    {/* Feet */}
                    <path d="M128 585 L118 614 L188 614 L182 585 Z" fill="#1e1936" stroke="#da7756" strokeWidth="2" />
                    <path d="M272 585 L282 614 L212 614 L218 585 Z" fill="#1e1936" stroke="#da7756" strokeWidth="2" />
                    <rect x="123" y="608" width="60" height="6" rx="3" fill="url(#f5-pride)" />
                    <rect x="217" y="608" width="60" height="6" rx="3" fill="url(#f5-pride)" />
                </g>

                {/* TORSO — a closed book seen from the spine, opened at the heart */}
                <g filter="url(#f5-shadow)">
                    <path d="M132 262 L268 262 L278 385 L262 452 L138 452 L122 385 Z"
                          fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    {/* Book-spine ridges */}
                    <path d="M132 285 L268 285 M128 310 L272 310 M126 410 L274 410" stroke="#9b59b6" strokeWidth="1.5" opacity="0.35" />

                    {/* Pride bookmark ribbon trailing from the book-heart */}
                    <path d="M236 372 L244 448 L236 440 L228 452 L224 372 Z" fill="url(#f5-pride-v)" opacity="0.9" />

                    {/* Open storybook core */}
                    <g>
                        <path d="M148 305 C 175 292, 195 295, 200 305 C 205 295, 225 292, 252 305 L252 362 C 225 352, 205 355, 200 364 C 195 355, 175 352, 148 362 Z"
                              fill="url(#f5-parchment)" stroke="#b85a3c" strokeWidth="2.5" filter="url(#f5-glow)" />
                        <path d="M200 305 L200 364" stroke="#b85a3c" strokeWidth="2" />
                        {/* Ink lines of the ever-writing story */}
                        <g stroke="#6b4a8a" strokeWidth="1.8" strokeLinecap="round" opacity="0.75">
                            <path d="M158 316 L190 313" />
                            <path d="M158 326 L188 323" />
                            <path d="M158 336 L191 333" />
                            <path d="M158 346 L184 343" />
                            <path d="M210 313 L242 316" />
                            <path d="M212 323 L242 326" />
                            <path d="M209 333 L242 336" />
                            <path d="M216 343 L242 346" />
                        </g>
                        {/* A page mid-turn */}
                        <path d="M200 305 C 207 297, 222 294, 238 300 L238 352 C 222 346, 207 349, 200 357 Z"
                              fill="#fffaf0" opacity="0.55" className="f5-pageflip" />
                    </g>

                    {/* Orbiting story-spark circling the book heart */}
                    <g className="f5-orbit">
                        <circle cx="200" cy="278" r="4" fill="#ffc24d" filter="url(#f5-glow)" />
                    </g>

                    {/* Shoulder epaulettes */}
                    <rect x="132" y="266" width="14" height="42" rx="3" fill="url(#f5-clay)" />
                    <rect x="254" y="266" width="14" height="42" rx="3" fill="url(#f5-clay)" />
                </g>

                {/* ARMS */}
                <g filter="url(#f5-shadow)">
                    {/* Left arm */}
                    <circle cx="114" cy="284" r="33" fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    <circle cx="114" cy="284" r="20" fill="none" stroke="#ffc24d" strokeWidth="2" strokeDasharray="6 5" opacity="0.8" />
                    <path d="M100 314 L92 402 L130 402 L130 314 Z" fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    <circle cx="111" cy="408" r="14" fill="#1e1936" stroke="#9b59b6" strokeWidth="2" />
                    <path d="M97 422 L88 498 L136 498 L127 422 Z" fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    <rect x="83" y="498" width="58" height="34" rx="10" fill="#1e1936" stroke="#da7756" strokeWidth="2" />
                    <path d="M93 532 L93 552 M108 532 L108 558 M123 532 L123 552 M132 532 L132 547"
                          stroke="#2b2447" strokeWidth="6" strokeLinecap="round" />

                    {/* Right arm — raised, holding a quill pen */}
                    <circle cx="286" cy="284" r="33" fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    <circle cx="286" cy="284" r="20" fill="none" stroke="#ffc24d" strokeWidth="2" strokeDasharray="6 5" opacity="0.8" />
                    <path d="M270 314 L300 314 L322 380 L292 392 Z" fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    <circle cx="308" cy="388" r="14" fill="#1e1936" stroke="#9b59b6" strokeWidth="2" />
                    <path d="M300 398 L316 380 L352 332 L338 322 L302 372 Z" fill="url(#f5-ink)" stroke="#2b2447" strokeWidth="2" />
                    {/* Hand gripping the quill */}
                    <circle cx="347" cy="326" r="16" fill="#1e1936" stroke="#da7756" strokeWidth="2" />
                    {/* The quill */}
                    <g>
                        <path d="M347 326 L362 250" stroke="#ecd9ae" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M358 268 C 344 252, 348 224, 366 206 C 372 226, 372 252, 362 268 Z"
                              fill="url(#f5-pride-v)" opacity="0.92" filter="url(#f5-glow)" />
                        <path d="M347 326 L342 342" stroke="#6b4a8a" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Ink drop */}
                        <circle cx="341" cy="348" r="3.5" fill="#9b59b6" className="f5-twinkle" />
                    </g>
                </g>

                {/* HEAD */}
                <g filter="url(#f5-shadow)">
                    <rect x="176" y="232" width="48" height="34" rx="5" fill="#1e1936" stroke="#2b2447" strokeWidth="2" />
                    <path d="M182 242 L218 242 M182 252 L218 252" stroke="#da7756" strokeWidth="1" opacity="0.5" />

                    {/* Cranium */}
                    <path d="M132 105 C 132 52, 268 52, 268 105 L 272 198 C 272 238, 128 238, 128 198 Z"
                          fill="url(#f5-ink)" stroke="#da7756" strokeWidth="3" filter="url(#f5-glow)" />

                    {/* Face plate, parchment-toned */}
                    <path d="M150 96 C 150 64, 250 64, 250 96 L 253 182 C 253 212, 147 212, 147 182 Z"
                          fill="#141026" stroke="#2b2447" strokeWidth="2" />

                    {/* Eyes */}
                    <g className="f5-blink">
                        <ellipse cx="172" cy="138" rx="26" ry="21" fill="#0c0918" />
                        <ellipse cx="228" cy="138" rx="26" ry="21" fill="#0c0918" />
                        <g transform={`translate(${eyePos.x}, ${eyePos.y})`}>
                            <ellipse cx="172" cy="138" rx="14" ry="13" fill="url(#f5-eye)" filter="url(#f5-glow)" />
                            <ellipse cx="172" cy="134" rx="5" ry="4" fill="#ffffff" opacity="0.85" />
                            <ellipse cx="228" cy="138" rx="14" ry="13" fill="url(#f5-eye)" filter="url(#f5-glow)" />
                            <ellipse cx="228" cy="134" rx="5" ry="4" fill="#ffffff" opacity="0.85" />
                        </g>
                    </g>

                    {/* Mouth — a sly storyteller's smile on hover */}
                    <path
                        d={isHovered ? "M168 180 Q200 204, 232 178" : "M170 184 Q200 190, 230 184"}
                        stroke="#ffc24d" strokeWidth="4" fill="none" strokeLinecap="round"
                        style={{ transition: 'd 0.3s ease' }}
                    />

                    {/* Brow band */}
                    <rect x="160" y="74" width="80" height="8" rx="4" fill="url(#f5-pride)" />

                    {/* Cheek vents */}
                    <g opacity="0.7" stroke="#9b59b6" strokeWidth="2">
                        <path d="M138 128 L128 132 M138 142 L126 147 M138 156 L128 161" />
                        <path d="M262 128 L272 132 M262 142 L274 147 M262 156 L272 161" />
                    </g>

                    {/* Quill-plume antenna */}
                    <g className="f5-quill">
                        <path d="M200 62 L200 28" stroke="#ecd9ae" strokeWidth="4" strokeLinecap="round" />
                        <path d="M200 34 C 188 22, 190 0, 204 -8 C 212 6, 212 26, 203 36 Z"
                              fill="url(#f5-clay)" filter="url(#f5-glow)" />
                        <circle cx="200" cy="26" r="5" fill="#ffc24d" filter="url(#f5-glow)" className="f5-twinkle" />
                    </g>
                </g>

                {/* Story glyphs drifting up from the open book */}
                <g fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fill="#ffc24d" filter="url(#f5-glow)">
                    <text x="170" y="300" className="f5-drift-l" opacity="0">❝</text>
                    <text x="222" y="305" className="f5-drift" style={{ animationDelay: '1.3s' }} opacity="0">✶</text>
                    <text x="194" y="295" className="f5-drift-l" style={{ animationDelay: '2.6s' }} opacity="0">❞</text>
                    <text x="208" y="300" fontSize="15" className="f5-drift" style={{ animationDelay: '3.7s' }} opacity="0">⁂</text>
                </g>
            </g>
        </svg>
    );
}
