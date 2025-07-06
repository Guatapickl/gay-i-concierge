"use client";

import Particles from "react-tsparticles";
import type { Engine as OldEngine } from "tsparticles-engine";
import type { Engine } from "@tsparticles/engine";
import { loadFull } from "tsparticles";
import { useCallback } from "react";

export default function BackgroundParticles() {
  const particlesInit = useCallback(async (engine: OldEngine) => {
    await loadFull(engine as unknown as Engine);
  }, []);

  return (
    <Particles
      id="background-particles"
      init={particlesInit}
      options={{
        fullScreen: { enable: true, zIndex: 0 },
        background: { color: "transparent" },
        particles: {
          number: { value: 60, density: { enable: true, area: 800 } },
          color: { value: "#ff69b4" },
          links: {
            enable: true,
            color: "#ff69b4",
            distance: 150,
            opacity: 0.5,
          },
          move: { enable: true, speed: 1 },
          size: { value: { min: 1, max: 3 } },
          opacity: { value: 0.5 },
        },
      }}
    />
  );
}
