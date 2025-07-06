"use client";

import { useCallback } from "react";
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadFull } from "tsparticles";

const BackgroundParticles = () => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      id="backgroundParticles"
      init={particlesInit}
      className="absolute inset-0 z-[-1] pointer-events-none"
      options={{
        fpsLimit: 60,
        background: { color: "#000" },
        particles: {
          number: { value: 50, density: { enable: true, area: 800 } },
          color: { value: "#0ff" },
          shape: { type: "circle" },
          opacity: { value: 0.5 },
          size: { value: 3, random: true },
          links: {
            enable: true,
            distance: 120,
            color: "#0ff",
            opacity: 0.4,
            width: 1
          },
          move: { enable: true, speed: 1, outModes: "out" }
        },
        interactivity: {
          events: { onHover: { enable: true, mode: "repulse" } },
          modes: { repulse: { distance: 100, duration: 0.4 } }
        },
        detectRetina: true
      }}
    />
  );
};

export default BackgroundParticles;
