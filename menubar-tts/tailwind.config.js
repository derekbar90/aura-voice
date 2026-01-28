/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Merriweather"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(15, 23, 42, 0.35)',
      },
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#eef2f7',
          200: '#d9e2ec',
          300: '#b7c5d6',
          400: '#8ea3ba',
          500: '#6c849c',
          600: '#51667c',
          700: '#3b4c5d',
          800: '#26323f',
          900: '#141b24',
        },
        ember: {
          400: '#f59e0b',
          500: '#f97316',
          600: '#ea580c',
        },
      },
    },
  },
  plugins: [],
}
