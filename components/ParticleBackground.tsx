"use client";
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ParticleNetwork with SSR disabled
const DynamicParticleNetwork = dynamic(
  () => import('canvas-particle-network').then(mod => mod.default || mod), // Handle potential default export issues
  { ssr: false }
);

export default function ParticleBackground() {
  useEffect(() => {
    const container = document.getElementById('particle-canvas');
    if (!container) return;

    // Ensure DynamicParticleNetwork is loaded before trying to use it
    if (typeof DynamicParticleNetwork !== 'function') {
      // It might still be loading, or failed to load
      // We could add a timeout/retry or a loading state here if needed
      return;
    }

    const options = {
      particleColor: '#ff5ebc',
      background: '#0a0a0a',
      interactive: true,
      speed: 'slow',
      density: 10000,
    } as const;

    // @ts-ignore because DynamicParticleNetwork might not be recognized as a constructor by TS immediately
    new DynamicParticleNetwork(container, options);
  }, [DynamicParticleNetwork]); // Add DynamicParticleNetwork to dependency array

  return null;
}
