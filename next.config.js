/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tsparticles/react', '@tsparticles/slim', '@tsparticles/engine'],
  experimental: {
    esmExternals: false
  }
};

module.exports = nextConfig;
