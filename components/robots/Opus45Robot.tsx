"use client";

import React, { useEffect, useState, useRef } from 'react';

interface RobotProps {
    className?: string;
}

export default function Opus45Robot({ className = "" }: RobotProps) {
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

            const limit = 8;
            setEyePos({
                x: Math.max(-limit, Math.min(limit, dirX * limit)),
                y: Math.max(-limit, Math.min(limit, dirY * limit))
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
            aria-labelledby="opus45-title"
            className={`w-full h-full ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <title id="opus45-title">Claude Opus 4.5 Robot</title>
            <defs>
                {/* Anthropic-inspired warm gradients */}
                <linearGradient id="o45-coral" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff6b4a" />
                    <stop offset="50%" stopColor="#e85d3b" />
                    <stop offset="100%" stopColor="#cc4125" />
                </linearGradient>
                <linearGradient id="o45-warm-metal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3a2f2a" />
                    <stop offset="50%" stopColor="#2a2320" />
                    <stop offset="100%" stopColor="#1a1615" />
                </linearGradient>
                <linearGradient id="o45-purple-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9b59b6" />
                    <stop offset="100%" stopColor="#8e44ad" />
                </linearGradient>
                <linearGradient id="o45-pride" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#e74c3c" />
                    <stop offset="16%" stopColor="#e67e22" />
                    <stop offset="32%" stopColor="#f1c40f" />
                    <stop offset="48%" stopColor="#2ecc71" />
                    <stop offset="64%" stopColor="#3498db" />
                    <stop offset="80%" stopColor="#9b59b6" />
                    <stop offset="100%" stopColor="#e91e8b" />
                </linearGradient>
                <radialGradient id="o45-core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff6b4a" />
                    <stop offset="40%" stopColor="#ff6b4a" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="o45-eye-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#ff6b4a" />
                    <stop offset="100%" stopColor="#cc4125" />
                </radialGradient>

                {/* Filters */}
                <filter id="o45-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="o45-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.4" />
                </filter>

                {/* Musical pattern - representing "Opus" */}
                <pattern id="o45-opus-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="8" cy="20" r="4" fill="#ff6b4a" fillOpacity="0.1" />
                    <path d="M12 20 L12 8 L18 6 L18 18" stroke="#ff6b4a" strokeWidth="1.5" strokeOpacity="0.1" fill="none" />
                </pattern>
            </defs>

            {/* Background aura */}
            <ellipse cx="200" cy="350" rx="180" ry="280" fill="url(#o45-core-glow)" opacity="0.15" className="animate-pulse" />

            {/* Floating platform with pride ring */}
            <g transform="translate(200, 650)">
                <ellipse cx="0" cy="0" rx="120" ry="25" fill="#1a1615" opacity="0.6" />
                <ellipse cx="0" cy="-8" rx="100" ry="20" fill="none" stroke="url(#o45-pride)" strokeWidth="3" opacity="0.7" className="animate-spin-slow" />
                <ellipse cx="0" cy="-8" rx="60" ry="12" fill="none" stroke="#ff6b4a" strokeWidth="2" opacity="0.5" />
            </g>

            {/* Main body group with float animation */}
            <g className="animate-float">

                {/* LEGS */}
                <g filter="url(#o45-soft-shadow)">
                    {/* Left leg */}
                    <path d="M150 440 L140 520 L130 580 L170 580 L175 520 L170 440 Z"
                          fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <rect x="135" y="470" width="35" height="8" fill="url(#o45-coral)" opacity="0.6" rx="2" />
                    <rect x="135" y="510" width="35" height="8" fill="url(#o45-purple-accent)" opacity="0.6" rx="2" />
                    {/* Left foot */}
                    <path d="M125 580 L115 610 L185 610 L180 580 Z" fill="#2a2320" stroke="#ff6b4a" strokeWidth="2" />
                    <rect x="120" y="605" width="60" height="6" fill="url(#o45-pride)" rx="3" />

                    {/* Right leg */}
                    <path d="M250 440 L260 520 L270 580 L230 580 L225 520 L230 440 Z"
                          fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <rect x="230" y="470" width="35" height="8" fill="url(#o45-coral)" opacity="0.6" rx="2" />
                    <rect x="230" y="510" width="35" height="8" fill="url(#o45-purple-accent)" opacity="0.6" rx="2" />
                    {/* Right foot */}
                    <path d="M275 580 L285 610 L215 610 L220 580 Z" fill="#2a2320" stroke="#ff6b4a" strokeWidth="2" />
                    <rect x="220" y="605" width="60" height="6" fill="url(#o45-pride)" rx="3" />
                </g>

                {/* TORSO */}
                <g filter="url(#o45-soft-shadow)">
                    {/* Lower torso */}
                    <path d="M145 380 L255 380 L260 450 L140 450 Z" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <rect x="145" y="380" width="110" height="70" fill="url(#o45-opus-pattern)" />

                    {/* Main chest */}
                    <path d="M130 260 L270 260 L280 380 L120 380 Z" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <rect x="130" y="260" width="140" height="120" fill="url(#o45-opus-pattern)" />

                    {/* Chest plate with core */}
                    <path d="M150 280 L250 280 L255 360 L145 360 Z" fill="#1a1615" stroke="#ff6b4a" strokeWidth="2" />

                    {/* Core reactor - the "heart" */}
                    <circle cx="200" cy="320" r="35" fill="#1a1615" stroke="#ff6b4a" strokeWidth="3" />
                    <circle cx="200" cy="320" r="28" fill="none" stroke="url(#o45-pride)" strokeWidth="2"
                            className="animate-spin-slow" style={{ transformOrigin: '200px 320px' }} />
                    <circle cx="200" cy="320" r="18" fill="url(#o45-eye-glow)" filter="url(#o45-glow)"
                            className="animate-pulse" />
                    {/* Inner symbol - abstract "A" for Anthropic */}
                    <path d="M192 328 L200 308 L208 328 M195 322 L205 322"
                          stroke="#1a1615" strokeWidth="3" fill="none" strokeLinecap="round" />

                    {/* Shoulder pride stripes */}
                    <rect x="130" y="265" width="15" height="40" fill="url(#o45-pride)" rx="3" />
                    <rect x="255" y="265" width="15" height="40" fill="url(#o45-pride)" rx="3" />
                </g>

                {/* ARMS */}
                <g filter="url(#o45-soft-shadow)">
                    {/* Left shoulder */}
                    <circle cx="115" cy="280" r="35" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <circle cx="115" cy="280" r="22" fill="none" stroke="#ff6b4a" strokeWidth="2" strokeDasharray="8 4"
                            className="animate-spin-slow" style={{ animationDirection: 'reverse', transformOrigin: '115px 280px' }} />

                    {/* Left upper arm */}
                    <path d="M100 310 L90 400 L130 400 L130 310 Z" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <rect x="95" y="340" width="30" height="6" fill="url(#o45-coral)" rx="2" />

                    {/* Left elbow */}
                    <circle cx="110" cy="405" r="15" fill="#2a2320" stroke="#9b59b6" strokeWidth="2" />

                    {/* Left forearm */}
                    <path d="M95 420 L85 500 L135 500 L125 420 Z" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />

                    {/* Left hand */}
                    <rect x="80" y="500" width="60" height="35" rx="10" fill="#2a2320" stroke="#ff6b4a" strokeWidth="2" />
                    <path d="M90 535 L90 555 M105 535 L105 560 M120 535 L120 555 M130 535 L130 550"
                          stroke="#3a2f2a" strokeWidth="6" strokeLinecap="round" />

                    {/* Right shoulder */}
                    <circle cx="285" cy="280" r="35" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <circle cx="285" cy="280" r="22" fill="none" stroke="#ff6b4a" strokeWidth="2" strokeDasharray="8 4"
                            className="animate-spin-slow" style={{ transformOrigin: '285px 280px' }} />

                    {/* Right upper arm */}
                    <path d="M300 310 L310 400 L270 400 L270 310 Z" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />
                    <rect x="275" y="340" width="30" height="6" fill="url(#o45-coral)" rx="2" />

                    {/* Right elbow */}
                    <circle cx="290" cy="405" r="15" fill="#2a2320" stroke="#9b59b6" strokeWidth="2" />

                    {/* Right forearm */}
                    <path d="M305 420 L315 500 L265 500 L275 420 Z" fill="url(#o45-warm-metal)" stroke="#3a2f2a" strokeWidth="2" />

                    {/* Right hand */}
                    <rect x="260" y="500" width="60" height="35" rx="10" fill="#2a2320" stroke="#ff6b4a" strokeWidth="2" />
                    <path d="M270 535 L270 550 M280 535 L280 555 M295 535 L295 560 M310 535 L310 555"
                          stroke="#3a2f2a" strokeWidth="6" strokeLinecap="round" />
                </g>

                {/* HEAD */}
                <g filter="url(#o45-soft-shadow)">
                    {/* Neck */}
                    <rect x="175" y="230" width="50" height="35" fill="#2a2320" stroke="#3a2f2a" strokeWidth="2" rx="5" />
                    <path d="M180 240 L220 240 M180 250 L220 250" stroke="#ff6b4a" strokeWidth="1" opacity="0.5" />

                    {/* Main head - rounded, friendly shape */}
                    <path d="M130 100 C130 50, 270 50, 270 100 L275 200 C275 240, 125 240, 125 200 Z"
                          fill="url(#o45-warm-metal)" stroke="#ff6b4a" strokeWidth="3" filter="url(#o45-glow)" />

                    {/* Face plate */}
                    <path d="M150 90 C150 60, 250 60, 250 90 L255 180 C255 210, 145 210, 145 180 Z"
                          fill="#1a1615" stroke="#3a2f2a" strokeWidth="2" />

                    {/* Eyes - warm, friendly glow */}
                    <g>
                        {/* Eye sockets */}
                        <ellipse cx="170" cy="130" rx="28" ry="22" fill="#0f0d0c" />
                        <ellipse cx="230" cy="130" rx="28" ry="22" fill="#0f0d0c" />

                        {/* Interactive pupils */}
                        <g transform={`translate(${eyePos.x}, ${eyePos.y})`}>
                            <ellipse cx="170" cy="130" rx="16" ry="14" fill="url(#o45-eye-glow)" filter="url(#o45-glow)" />
                            <ellipse cx="170" cy="127" rx="6" ry="5" fill="#ffffff" opacity="0.8" />
                            <ellipse cx="230" cy="130" rx="16" ry="14" fill="url(#o45-eye-glow)" filter="url(#o45-glow)" />
                            <ellipse cx="230" cy="127" rx="6" ry="5" fill="#ffffff" opacity="0.8" />
                        </g>
                    </g>

                    {/* Friendly smile or neutral expression based on hover */}
                    <path
                        d={isHovered ? "M165 175 Q200 200, 235 175" : "M165 180 L235 180"}
                        stroke="#ff6b4a"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        style={{ transition: 'd 0.3s ease' }}
                    />

                    {/* Forehead accent */}
                    <rect x="160" y="70" width="80" height="8" fill="url(#o45-pride)" rx="4" />

                    {/* Side vents */}
                    <g opacity="0.7">
                        <path d="M135 120 L125 125 M135 135 L122 140 M135 150 L125 155" stroke="#9b59b6" strokeWidth="2" />
                        <path d="M265 120 L275 125 M265 135 L278 140 M265 150 L275 155" stroke="#9b59b6" strokeWidth="2" />
                    </g>

                    {/* Antennae */}
                    <g>
                        <path d="M160 55 L150 25" stroke="#ff6b4a" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="150" cy="20" r="8" fill="#ff6b4a" filter="url(#o45-glow)" className="animate-pulse" />

                        <path d="M240 55 L250 25" stroke="#9b59b6" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="250" cy="20" r="8" fill="#9b59b6" filter="url(#o45-glow)" className="animate-pulse"
                                style={{ animationDelay: '500ms' }} />
                    </g>
                </g>

                {/* Floating decorative elements */}
                <g opacity="0.4" className="animate-pulse">
                    <circle cx="60" cy="200" r="4" fill="#ff6b4a" />
                    <circle cx="340" cy="180" r="5" fill="#9b59b6" />
                    <circle cx="55" cy="400" r="3" fill="#f1c40f" />
                    <circle cx="345" cy="420" r="4" fill="#3498db" />
                </g>
            </g>

            {/* Ambient light rays */}
            <g opacity="0.1">
                <path d="M200 320 L50 100" stroke="#ff6b4a" strokeWidth="2" />
                <path d="M200 320 L350 80" stroke="#9b59b6" strokeWidth="2" />
                <path d="M200 320 L30 400" stroke="#f1c40f" strokeWidth="1" />
                <path d="M200 320 L370 380" stroke="#3498db" strokeWidth="1" />
            </g>
        </svg>
    );
}
