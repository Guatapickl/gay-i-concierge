"use client";
import { useEffect } from 'react';
import ParticleNetwork from 'canvas-particle-network';

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
    new ParticleNetwork(container, options);
  }, []);
  return null;
}
