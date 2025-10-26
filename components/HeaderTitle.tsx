'use client';

import { useState, useEffect } from 'react';

export default function HeaderTitle() {
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 150);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      className={`text-2xl font-bold text-center md:text-left font-orbitron base-holographic ${glitchActive ? 'glitch-active' : ''}`}
    >
      Gay I Club
    </h1>
  );
}
