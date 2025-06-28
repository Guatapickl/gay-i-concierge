declare module 'canvas-particle-network' {
  interface ParticleNetworkOptions {
    particleColor?: string;
    background?: string;
    interactive?: boolean;
    speed?: 'none' | 'slow' | 'medium' | 'fast';
    density?: number | 'low' | 'medium' | 'high';
  }
  export default class ParticleNetwork {
    constructor(element: HTMLElement, options?: ParticleNetworkOptions);
  }
}
