import React from 'react';

export default function FuturisticRobot({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 800 800"
            className={`w-full h-full ${className}`}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Gradients */}
                <linearGradient id="metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2a2a2a" />
                    <stop offset="50%" stopColor="#4a4a4a" />
                    <stop offset="100%" stopColor="#1a1a1a" />
                </linearGradient>
                <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00ccff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="magenta-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff00cc" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#cc00ff" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00ffff" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff00cc" />
                    <stop offset="80%" stopColor="#330033" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                {/* Filters */}
                <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="intense-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="10" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background Aura */}
            <circle cx="400" cy="400" r="300" fill="url(#core-glow)" opacity="0.1" className="animate-pulse" />

            {/* Neck / Base */}
            <path d="M350 550 L450 550 L470 700 L330 700 Z" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" />
            <path d="M360 550 L360 650 M440 550 L440 650" stroke="#00ffff" strokeWidth="2" opacity="0.5" />

            {/* Shoulders */}
            <path d="M200 700 Q400 650 600 700 L650 800 L150 800 Z" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
            <path d="M200 700 L250 750 M600 700 L550 750" stroke="#ff00cc" strokeWidth="3" filter="url(#glow-filter)" />

            {/* Head Shape */}
            <g transform="translate(400, 350)">
                {/* Main Cranium */}
                <path
                    d="M-120 -150 C-120 -250, 120 -250, 120 -150 L100 100 L0 150 L-100 100 Z"
                    fill="url(#metal-gradient)"
                    stroke="#00ffff"
                    strokeWidth="2"
                    filter="url(#glow-filter)"
                />

                {/* Face Plate */}
                <path
                    d="M-80 -100 L80 -100 L70 50 L0 80 L-70 50 Z"
                    fill="#0f0f0f"
                    stroke="#333"
                    strokeWidth="1"
                />

                {/* Eyes */}
                <g className="animate-pulse">
                    <path d="M-60 -20 L-20 -20 L-25 0 L-55 0 Z" fill="#00ffff" filter="url(#intense-glow)" />
                    <path d="M60 -20 L20 -20 L25 0 L55 0 Z" fill="#00ffff" filter="url(#intense-glow)" />
                </g>

                {/* Forehead Detail */}
                <path d="M-40 -120 L40 -120 L30 -110 L-30 -110 Z" fill="#ff00cc" opacity="0.8" filter="url(#glow-filter)" />
                <circle cx="0" cy="-135" r="5" fill="#00ffff" filter="url(#intense-glow)" />

                {/* Cheek Lines */}
                <path d="M-80 -50 L-100 -30 M80 -50 L100 -30" stroke="#333" strokeWidth="2" />

                {/* Mouth / Grill */}
                <path d="M-30 60 L30 60" stroke="#333" strokeWidth="2" />
                <path d="M-20 70 L20 70" stroke="#333" strokeWidth="2" />

                {/* Side Antennas */}
                <path d="M-120 -150 L-150 -200 M120 -150 L150 -200" stroke="#00ffff" strokeWidth="2" opacity="0.6" />
                <circle cx="-150" cy="-200" r="3" fill="#ff00cc" filter="url(#glow-filter)" />
                <circle cx="150" cy="-200" r="3" fill="#ff00cc" filter="url(#glow-filter)" />
            </g>

            {/* HUD Overlay Effects */}
            <g stroke="#00ffff" strokeWidth="1" fill="none" opacity="0.3">
                <circle cx="400" cy="350" r="200" strokeDasharray="10 20" className="animate-spin-slow" />
                <circle cx="400" cy="350" r="220" strokeDasharray="50 50" strokeOpacity="0.5" className="animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                <path d="M380 350 L420 350 M400 330 L400 370" strokeOpacity="0.8" />
            </g>

            {/* Data Stream Particles (Static representation in SVG) */}
            <circle cx="200" cy="200" r="2" fill="#ff00cc" className="animate-ping" />
            <circle cx="600" cy="500" r="2" fill="#00ffff" className="animate-ping" style={{ animationDelay: '1s' }} />
        </svg>
    );
}
