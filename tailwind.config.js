/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0d0d0f',
          900: '#0a0a0c',
          800: '#121214',
          700: '#1a1a1d',
          600: '#242427',
        },
        rice: {
          DEFAULT: '#f2ead9',
          50: '#faf6ec',
          100: '#f2ead9',
          200: '#e6dcc3',
        },
        bronze: {
          DEFAULT: '#5b6459',
          light: '#7c8874',
          dark: '#3c4438',
        },
        gilt: {
          DEFAULT: '#a8863f',
          light: '#c9a76a',
          dark: '#7a611f',
        },
        cinnabar: {
          DEFAULT: '#9c3b2e',
          light: '#b8503f',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.35em',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        drift: {
          '0%': { transform: 'translate(0,0)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.4' },
          '100%': { transform: 'translate(10px,-40px)', opacity: '0' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '45%': { opacity: '0.85' },
          '55%': { opacity: '0.95' },
        },
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        drift: 'drift 8s ease-in infinite',
        flicker: 'flicker 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
