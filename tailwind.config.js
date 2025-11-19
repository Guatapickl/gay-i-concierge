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
        primary: '#ff00cc', // Retro Pink
        secondary: '#333399', // Retro Blue
        accent: '#00ffff', // Cyan
        background: '#0f0c29', // Deep Purple/Black
        foreground: '#ededed',
        'retro-bg': '#24243e',
        'retro-surface': 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)', 'monospace'],
        space: ['var(--font-orbitron)', 'sans-serif'],
      },
      animation: {
        ping: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #ff00cc, 0 0 10px #ff00cc' },
          '100%': { boxShadow: '0 0 20px #ff00cc, 0 0 30px #ff00cc' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};
