/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        background: '#0f172a',
        surface: '#1e293b',
        'surface-2': '#334155',
        text: '#f1f5f9',
        muted: '#94a3b8',
        success: '#22c55e',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
