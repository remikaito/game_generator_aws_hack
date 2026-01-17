/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-dark': '#0a0a0f',
        'game-darker': '#05050a',
        'game-accent': '#6366f1',
        'game-accent-light': '#818cf8',
        'game-success': '#10b981',
        'game-warning': '#f59e0b',
        'game-error': '#ef4444',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
};
