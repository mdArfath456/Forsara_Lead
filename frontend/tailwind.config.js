/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#dce6ff',
          400: '#7c8cff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        surface: {
          950: '#0a0a12', // app background — deep navy/black per reference design
          900: '#12121c',
          800: '#1a1a29',
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))',
        'brand-gradient': 'linear-gradient(135deg, #6366f1, #a855f7)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
        glow: '0 0 24px 0 rgba(99, 102, 241, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
