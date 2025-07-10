"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

interface BackgroundParticlesProps {
  config?: ISourceOptions;
}

export default function BackgroundParticles({ config }: BackgroundParticlesProps) {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) return null;

  const defaultConfig = {
    fullScreen: {
      enable: true,
      zIndex: -1,
    },
    background: {
      color: { value: "transparent" },
    },
    fpsLimit: 60,
    particles: {
      color: { value: "#ff69b4" },
      links: {
        color: "#ff69b4",
        distance: 150,
        enable: true,
        opacity: 0.5,
        width: 1,
      },
      move: {
        direction: "none",
        enable: true,
        outModes: {
          default: "bounce",
        },
        random: false,
        speed: 1,
        straight: false,
      },
      number: {
        value: 60,
      },
      opacity: {
        value: 0.5,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
    responsive: [
      {
        maxWidth: 1024,
        options: {
          particles: {
            number: { value: 40 },
          },
          fpsLimit: 45,
        },
      },
      {
        maxWidth: 768,
        options: {
          particles: {
            number: { value: 25 },
          },
          fpsLimit: 30,
        },
      },
    ],
  };

  return (
    <Particles
      id="tsparticles"
      className="particles-bg"
      options={config || defaultConfig}
    />
  );
}
