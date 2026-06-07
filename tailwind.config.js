/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fff8ef',
        paper: '#f4eee4',
        border: '#d8cec0',
        mint: '#dff4e7',
        butter: '#ffe8a3',
        tomato: '#e8482e',
        brand: {
          50: '#eef8f1',
          100: '#dff4e7',
          200: '#b8dfc8',
          300: '#82bd9b',
          400: '#4f936d',
          500: '#2f6f4c',
          600: '#174f35',
          700: '#123f2b',
          800: '#0d2f20',
          900: '#082317',
        },
        accent: {
          400: '#ff8f4f',
          500: '#ff6b1a',
          600: '#d65a16',
        },
        ink: {
          900: '#101713',
          700: '#243129',
          500: '#5f6f65',
          400: '#809086',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Fraunces', 'Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 23, 19, 0.06), 0 18px 40px -28px rgba(23, 79, 53, 0.30)',
        float: '0 16px 44px -16px rgba(23, 79, 53, 0.42)',
        hero: '0 24px 60px -24px rgba(13, 47, 32, 0.55)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
};
