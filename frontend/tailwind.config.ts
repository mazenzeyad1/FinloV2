import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C5CFC',
          400: '#9B80FD',
          300: '#C4B3FE',
          200: '#D8CFFE',
          100: '#EDE8FF',
          50:  '#F7F5FF',
        },
        'surface-2': '#F0EFF5',
        'surface-3': '#E8E6F0',
        'text-1': '#0F0E14',
        'text-2': '#6B6880',
        'text-3': '#9E9BAD',
        'text-4': '#C4C2CE',
        success: '#1DB87A',
        danger:  '#F04E4E',
        warning: '#F5A623',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
        xl: '18px',
      },
    },
  },
  plugins: [],
} satisfies Config
