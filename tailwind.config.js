const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff69b4',
        secondary: '#8b5cf6',
        accent: '#22d3ee',
        background: '#0a0a0a',
        foreground: '#ededed',
        indigo: colors.indigo,
        cyan: colors.cyan,
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'monospace'],
        space: ['var(--font-orbitron)', 'sans-serif'],
      },
      animation: {
        ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
