"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions, Engine } from "@tsparticles/engine";

export default function BackgroundParticles() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  const particlesOptions: ISourceOptions = {
    fullScreen: {
      enable: true,
      zIndex: -1
    },
    background: {
      color: { value: "transparent" }
    },
    fpsLimit: 60,
    particles: {
      color: { value: ["#00ffff", "#ff00cc"] }, // Cyan and Retro Pink
      links: {
        enable: false, // Disable links for data stream look
      },
      move: {
        direction: "right", // Move horizontally
        enable: true,
        outModes: {
          default: "out"
        },
        random: false,
        speed: 10, // Fast speed for "warp" effect
        straight: true
      },
      number: {
        value: 150, // More particles
        density: {
          enable: true,
        }
      },
      opacity: {
        value: { min: 0.1, max: 0.8 },
        animation: {
          enable: true,
          speed: 1,
          sync: false
        }
      },
      shape: {
        type: "circle"
      },
      size: {
        value: { min: 1, max: 3 }
      },
      // Add trails for data stream effect
      effect: {
        fill: true,
        close: true
      }
    },
    detectRetina: true,
  };

  return (
    <Particles
      id="tsparticles"
      options={particlesOptions}
    />
  );
}
