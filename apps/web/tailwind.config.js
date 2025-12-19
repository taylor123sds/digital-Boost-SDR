/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          DEFAULT: '#18c5ff',
          dark: '#0ea5d9',
        },
        violet: {
          DEFAULT: '#7c5cff',
          dark: '#6847eb',
        },
        dark: {
          bg: '#04060a',
          bg2: '#070c13',
          card: 'rgba(16, 24, 39, 0.5)',
        },
        glass: {
          bg: 'rgba(10,16,26,0.55)',
          border: 'rgba(24,197,255,0.15)',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
};
