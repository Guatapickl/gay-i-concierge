"use client";
import { useEffect } from 'react';

export default function ParticleBackground() {
  useEffect(() => {
    const container = document.getElementById('particle-canvas');
    if (!container) return;

    const options = {
      particleColor: '#ff5ebc',
      background: '#0a0a0a',
      interactive: true,
      speed: 'slow',
      density: 10000,
    } as const;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ParticleNetwork = require('canvas-particle-network');
    new ParticleNetwork(container, options);
  }, []); // run once on mount

  return null;
}
