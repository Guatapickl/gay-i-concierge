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
        background: '#0a0c10',
        surface: {
          DEFAULT: '#12151a',
          elevated: '#1a1e25',
          hover: '#232830',
        },
        primary: {
          DEFAULT: '#5c8ed9',
          muted: '#4a7bc4',
          subtle: 'rgba(92, 142, 217, 0.15)',
        },
        secondary: {
          DEFAULT: '#8b9cae',
          muted: '#6b7c8e',
        },
        foreground: {
          DEFAULT: '#f0ede8',
          muted: '#a8a29e',
          subtle: '#737373',
        },
        border: {
          DEFAULT: '#262626',
          subtle: '#1f1f1f',
        },
        success: '#5a9a7c',
        danger: '#d4626a',
        warning: '#d4a574',
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'display-sm': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)',
        'medium': '0 2px 4px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)',
        'large': '0 4px 8px rgba(0, 0, 0, 0.3), 0 16px 48px rgba(0, 0, 0, 0.25)',
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
