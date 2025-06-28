"use client";
import { useEffect } from 'react';

export default function ParticleBackground() {
  useEffect(() => {
    const container = document.getElementById('particle-canvas');
    if (!container) return;

    async function init() {
      const { default: ParticleNetwork } = await import('canvas-particle-network');

      const options = {
        particleColor: '#ff5ebc',
        background: '#0a0a0a',
        interactive: true,
        speed: 'slow',
        density: 10000,
      } as const;

      // @ts-expect-error ParticleNetwork might not be recognized as a constructor by TS immediately
      new ParticleNetwork(container, options);
    }

    init();
  }, []); // run once on mount

  return null;
}
