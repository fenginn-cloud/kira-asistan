/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // iOS-style blue accent
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // "soft" zeminler koyu temada koyu tona döner (global.css); aksi halde
        // açık zemin üzerindeki açık renkli yazılar okunmuyordu.
        success: { DEFAULT: '#16A34A', soft: 'rgb(var(--success-soft) / <alpha-value>)' },
        warning: { DEFAULT: '#D97706', soft: 'rgb(var(--warning-soft) / <alpha-value>)' },
        danger: { DEFAULT: '#DC2626', soft: 'rgb(var(--danger-soft) / <alpha-value>)' },
        // Structural tokens — flip between light/dark via CSS variables.
        surface: 'rgb(var(--surface) / <alpha-value>)',
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
      },
      borderRadius: {
        card: '20px',
        pill: '999px',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
