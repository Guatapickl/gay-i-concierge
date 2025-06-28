"use client";
import { useEffect } from 'react';

export default function ParticleBackground() {
  useEffect(() => {
    const container = document.getElementById('particle-canvas');
    if (!container) return;

    (async () => {
      const mod = await import('canvas-particle-network');
      const ParticleNetwork = mod.default ?? mod;

      if (typeof ParticleNetwork !== 'function') {
        console.error('ParticleNetwork export looks wrong →', mod);
        return;
      }

      new ParticleNetwork(container, {
        particleColor: '#ff5ebc',
        background: '#0a0a0a',
        interactive: true,
        speed: 'slow',
        density: 10000,
      });
    })();
  }, []);

  return null;
}
