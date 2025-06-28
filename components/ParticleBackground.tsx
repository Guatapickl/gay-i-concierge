"use client";
import { useEffect } from 'react';

export default function ParticleBackground() {
  useEffect(() => {
    const container = document.getElementById('particle-canvas');
    if (!container) return;

    async function load() {
      const { default: ParticleNetwork } = await import('canvas-particle-network');
      const options = {
        particleColor: '#ff5ebc',
        background: '#0a0a0a',
        interactive: true,
        speed: 'slow',
        density: 10000,
      } as const;
      new ParticleNetwork(container as HTMLElement, options);
    }

    load();
  }, []);
  return null;
}
