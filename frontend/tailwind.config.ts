import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1220',
        card: '#141d2f',
        accent: '#2dd4bf',
        muted: '#9ca3af',
      },
      boxShadow: {
        glow: '0 10px 35px rgba(45, 212, 191, 0.15)',
      },
    },
  },
  plugins: [],
} satisfies Config
