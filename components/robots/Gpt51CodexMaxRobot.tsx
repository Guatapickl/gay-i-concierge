"use client";

import React from 'react';

interface RobotProps {
    className?: string;
}

export default function Gpt51CodexMaxRobot({ className = "" }: RobotProps) {
    return (
        <svg
            viewBox="0 0 360 640"
            role="img"
            aria-labelledby="codex-max-title"
            className={`w-full h-full drop-shadow-[0_0_20px_rgba(0,0,0,0.6)] ${className}`}
            xmlns="http://www.w3.org/2000/svg"
        >
            <title id="codex-max-title">GPT-5.1 Codex Max Robot</title>
            <defs>
                <linearGradient id="midnight" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#111827" />
                    <stop offset="50%" stopColor="#0b1020" />
                    <stop offset="100%" stopColor="#060911" />
                </linearGradient>
                <linearGradient id="electric-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="pride-rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff3e3e" />
                    <stop offset="16%" stopColor="#ff9f1c" />
                    <stop offset="32%" stopColor="#ffd166" />
                    <stop offset="48%" stopColor="#06d6a0" />
                    <stop offset="64%" stopColor="#118ab2" />
                    <stop offset="80%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <radialGradient id="halo" cx="50%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background aura */}
            <rect width="360" height="640" fill="url(#midnight)" rx="30" />
            <ellipse cx="180" cy="320" rx="150" ry="250" fill="url(#halo)" className="animate-pulse" />

            {/* Floating rings */}
            <g className="animate-spin-slow" transform="translate(180 420)">
                <ellipse cx="0" cy="0" rx="120" ry="28" fill="none" stroke="url(#pride-rainbow)" strokeWidth="4" opacity="0.6" />
                <ellipse cx="0" cy="0" rx="70" ry="16" fill="none" stroke="url(#electric-cyan)" strokeWidth="3" opacity="0.5" />
            </g>

            {/* Body */}
            <g filter="url(#soft-glow)">
                <rect x="96" y="210" width="168" height="190" rx="26" fill="#0f172a" stroke="#1f2937" strokeWidth="4" />
                <rect x="116" y="230" width="128" height="90" rx="18" fill="#0b1329" stroke="#22d3ee" strokeWidth="3" />
                <rect x="116" y="330" width="128" height="50" rx="14" fill="#0b1329" stroke="#a855f7" strokeWidth="3" />
                <rect x="132" y="340" width="98" height="30" rx="8" fill="#111827" />
                <rect x="142" y="346" width="26" height="18" rx="6" fill="#22d3ee" className="animate-pulse" />
                <rect x="182" y="346" width="26" height="18" rx="6" fill="#f472b6" className="animate-pulse" style={{ animationDelay: '200ms' }} />
                <rect x="222" y="346" width="26" height="18" rx="6" fill="#c084fc" className="animate-pulse" style={{ animationDelay: '400ms' }} />
                <rect x="130" y="250" width="100" height="10" rx="4" fill="url(#pride-rainbow)" />
                <circle cx="240" cy="282" r="12" fill="#22d3ee" />
                <circle cx="240" cy="282" r="6" fill="#0f172a" />
            </g>

            {/* Shoulders */}
            <g>
                <rect x="70" y="220" width="50" height="100" rx="18" fill="#0b1329" stroke="#22d3ee" strokeWidth="3" />
                <rect x="240" y="220" width="50" height="100" rx="18" fill="#0b1329" stroke="#22d3ee" strokeWidth="3" />
                <rect x="70" y="240" width="50" height="12" fill="url(#pride-rainbow)" />
                <rect x="240" y="240" width="50" height="12" fill="url(#pride-rainbow)" />
            </g>

            {/* Arms */}
            <g strokeLinecap="round" strokeLinejoin="round">
                <path d="M85 320 C60 360, 60 420, 90 460" stroke="#22d3ee" strokeWidth="10" fill="none" />
                <path d="M70 458 L96 470" stroke="#f472b6" strokeWidth="10" />
                <path d="M275 320 C300 360, 300 420, 270 460" stroke="#22d3ee" strokeWidth="10" fill="none" />
                <path d="M260 470 L286 458" stroke="#f472b6" strokeWidth="10" />
                <circle cx="90" cy="470" r="16" fill="#0b1329" stroke="#22d3ee" strokeWidth="4" />
                <circle cx="270" cy="470" r="16" fill="#0b1329" stroke="#22d3ee" strokeWidth="4" />
            </g>

            {/* Head */}
            <g filter="url(#soft-glow)">
                <rect x="118" y="116" width="124" height="110" rx="28" fill="#0b1329" stroke="#22d3ee" strokeWidth="4" />
                <rect x="134" y="132" width="92" height="60" rx="16" fill="#0f172a" stroke="#a855f7" strokeWidth="3" />
                <rect x="144" y="144" width="30" height="36" rx="10" fill="#22d3ee" className="animate-pulse" />
                <rect x="186" y="144" width="30" height="36" rx="10" fill="#67e8f9" className="animate-pulse" style={{ animationDelay: '120ms' }} />
                <rect x="134" y="202" width="92" height="14" rx="7" fill="url(#pride-rainbow)" />
                <path d="M150 122 L210 122" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
                <path d="M168 108 L192 108" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" className="animate-pulse" />
            </g>

            {/* Antennae */}
            <g>
                <circle cx="150" cy="96" r="10" fill="#22d3ee" />
                <circle cx="210" cy="92" r="10" fill="#f472b6" />
                <path d="M150 96 L150 126" stroke="#22d3ee" strokeWidth="4" />
                <path d="M210 92 L210 122" stroke="#f472b6" strokeWidth="4" />
                <circle cx="150" cy="86" r="6" fill="#67e8f9" className="animate-ping" />
                <circle cx="210" cy="80" r="6" fill="#f9a8d4" className="animate-ping" />
            </g>

            {/* Legs */}
            <g filter="url(#soft-glow)">
                <rect x="126" y="400" width="44" height="120" rx="18" fill="#0b1329" stroke="#22d3ee" strokeWidth="3" />
                <rect x="190" y="400" width="44" height="120" rx="18" fill="#0b1329" stroke="#22d3ee" strokeWidth="3" />
                <rect x="118" y="520" width="60" height="26" rx="10" fill="#0f172a" stroke="#67e8f9" strokeWidth="3" />
                <rect x="182" y="520" width="60" height="26" rx="10" fill="#0f172a" stroke="#67e8f9" strokeWidth="3" />
                <rect x="110" y="548" width="76" height="14" rx="8" fill="url(#pride-rainbow)" />
                <rect x="174" y="548" width="76" height="14" rx="8" fill="url(#pride-rainbow)" />
            </g>

            {/* Grounding base */}
            <g transform="translate(180 592)">
                <ellipse cx="0" cy="16" rx="118" ry="18" fill="#0b1329" opacity="0.7" />
                <ellipse cx="0" cy="0" rx="70" ry="10" fill="url(#electric-cyan)" opacity="0.6" />
                <ellipse cx="0" cy="0" rx="40" ry="6" fill="url(#pride-rainbow)" opacity="0.6" />
            </g>
        </svg>
    );
}
