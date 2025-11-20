import React from 'react';

export default function FuturisticRobot({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 800 1200"
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
                <linearGradient id="dark-metal" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1a1a1a" />
                    <stop offset="100%" stopColor="#000000" />
                </linearGradient>
                <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ffff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00ccff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="magenta-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff00cc" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#cc00ff" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#00ffff" />
                    <stop offset="40%" stopColor="#00ffff" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <linearGradient id="limb-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#333" />
                    <stop offset="50%" stopColor="#666" />
                    <stop offset="100%" stopColor="#333" />
                </linearGradient>

                {/* Filters */}
                <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="intense-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Background Aura */}
            <ellipse cx="400" cy="600" rx="350" ry="500" fill="url(#core-glow)" opacity="0.05" className="animate-pulse" />

            {/* --- LEGS --- */}
            <g transform="translate(0, 0)">
                {/* Right Leg (Viewer's Left) */}
                <path d="M330 750 L280 900 L300 950 L350 950 L370 900 L370 750 Z" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" /> {/* Thigh */}
                <circle cx="325" cy="925" r="20" fill="#111" stroke="#00ffff" strokeWidth="2" /> {/* Knee */}
                <path d="M290 950 L270 1100 L360 1100 L380 950 Z" fill="url(#dark-metal)" stroke="#333" strokeWidth="2" /> {/* Shin */}
                <path d="M270 1100 L240 1150 L320 1150 L300 1100 Z" fill="#222" stroke="#00ffff" strokeWidth="1" /> {/* Foot */}
                {/* Detail */}
                <path d="M310 980 L310 1080" stroke="#ff00cc" strokeWidth="2" opacity="0.7" filter="url(#glow-filter)" />

                {/* Left Leg (Viewer's Right) */}
                <path d="M470 750 L520 900 L500 950 L450 950 L430 900 L430 750 Z" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" /> {/* Thigh */}
                <circle cx="475" cy="925" r="20" fill="#111" stroke="#00ffff" strokeWidth="2" /> {/* Knee */}
                <path d="M510 950 L530 1100 L440 1100 L420 950 Z" fill="url(#dark-metal)" stroke="#333" strokeWidth="2" /> {/* Shin */}
                <path d="M530 1100 L560 1150 L480 1150 L500 1100 Z" fill="#222" stroke="#00ffff" strokeWidth="1" /> {/* Foot */}
                {/* Detail */}
                <path d="M490 980 L490 1080" stroke="#ff00cc" strokeWidth="2" opacity="0.7" filter="url(#glow-filter)" />
            </g>

            {/* --- TORSO --- */}
            <g>
                {/* Abdomen */}
                <path d="M350 600 L450 600 L430 750 L370 750 Z" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
                <path d="M360 620 L440 620 M365 650 L435 650 M370 680 L430 680" stroke="#333" strokeWidth="1" />

                {/* Chest */}
                <path d="M300 450 L500 450 L460 600 L340 600 Z" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" />

                {/* Core Reactor */}
                <circle cx="400" cy="520" r="30" fill="#111" stroke="#333" strokeWidth="2" />
                <circle cx="400" cy="520" r="20" fill="#00ffff" filter="url(#intense-glow)" className="animate-pulse" />
                <path d="M400 500 L400 540 M380 520 L420 520" stroke="#fff" strokeWidth="2" opacity="0.5" />

                {/* Chest Details */}
                <path d="M320 470 L350 550 M480 470 L450 550" stroke="#ff00cc" strokeWidth="2" filter="url(#glow-filter)" />
                <rect x="380" y="460" width="40" height="10" fill="#222" />
                <rect x="385" y="462" width="10" height="6" fill="#00ffff" opacity="0.5" />
                <rect x="405" y="462" width="10" height="6" fill="#ff00cc" opacity="0.5" />
            </g>

            {/* --- ARMS --- */}
            <g>
                {/* Right Arm (Viewer's Left) */}
                <circle cx="280" cy="480" r="50" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" /> {/* Shoulder */}
                <circle cx="280" cy="480" r="30" fill="none" stroke="#00ffff" strokeWidth="2" strokeDasharray="10 5" className="animate-spin-slow" />
                <path d="M250 510 L230 650 L280 650 L290 510 Z" fill="url(#dark-metal)" stroke="#333" strokeWidth="2" /> {/* Upper Arm */}
                <circle cx="255" cy="650" r="15" fill="#222" stroke="#ff00cc" strokeWidth="1" /> {/* Elbow */}
                <path d="M240 660 L200 800 L260 800 L270 660 Z" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" /> {/* Forearm */}
                <rect x="210" y="800" width="40" height="40" rx="5" fill="#111" stroke="#333" /> {/* Hand */}
                <path d="M220 840 L220 860 M230 840 L230 865 M240 840 L240 860" stroke="#333" strokeWidth="3" /> {/* Fingers */}

                {/* Left Arm (Viewer's Right) */}
                <circle cx="520" cy="480" r="50" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" /> {/* Shoulder */}
                <circle cx="520" cy="480" r="30" fill="none" stroke="#00ffff" strokeWidth="2" strokeDasharray="10 5" className="animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                <path d="M550 510 L570 650 L520 650 L510 510 Z" fill="url(#dark-metal)" stroke="#333" strokeWidth="2" /> {/* Upper Arm */}
                <circle cx="545" cy="650" r="15" fill="#222" stroke="#ff00cc" strokeWidth="1" /> {/* Elbow */}
                <path d="M560 660 L600 800 L540 800 L530 660 Z" fill="url(#metal-gradient)" stroke="#333" strokeWidth="2" /> {/* Forearm */}
                <rect x="550" y="800" width="40" height="40" rx="5" fill="#111" stroke="#333" /> {/* Hand */}
                <path d="M560 840 L560 860 M570 840 L570 865 M580 840 L580 860" stroke="#333" strokeWidth="3" /> {/* Fingers */}
            </g>

            {/* --- HEAD --- */}
            <g transform="translate(400, 380) scale(0.8)">
                {/* Neck */}
                <rect x="-30" y="50" width="60" height="40" fill="#222" stroke="#333" />
                <path d="-20 50 L-20 90 M0 50 L0 90 M20 50 L20 90" stroke="#555" strokeWidth="2" />

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
                <circle cx="400" cy="380" r="250" strokeDasharray="10 20" className="animate-spin-slow" />
                <path d="M100 100 L150 100 L130 120" stroke="#ff00cc" strokeWidth="2" />
                <path d="M700 100 L650 100 L670 120" stroke="#ff00cc" strokeWidth="2" />
                <rect x="50" y="1000" width="100" height="10" fill="#00ffff" opacity="0.2" />
                <rect x="50" y="1020" width="70" height="5" fill="#ff00cc" opacity="0.2" />
            </g>

        </svg>
    );
}
