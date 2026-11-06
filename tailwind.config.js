/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Turtune — extraída del logotipo (teal → esmeralda → cian)
        base: '#101A1B',
        elevated: '#141F22',
        card: '#141F22',
        highlight: '#18262A',
        pressed: '#1E2C31',
        separator: 'rgba(255,255,255,0.07)',
        subtext: '#8CA8AB',
        accent: '#15D3A2', // teal del caparazón
        accentHover: '#4FE3B7', // menta clara
        accentDark: '#0A8F75',
        accentSoft: 'rgba(21,211,162,0.12)',
        accentGreen: '#5AE688', // verde de las patas
        accentCyan: '#02D0D4', // cian de la aleta delantera
      },
      fontFamily: {
        sans: ['Figtree', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.45)',
        glow: '0 0 0 2px rgba(21,211,162,0.45)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        eq: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.35s ease both',
        shimmer: 'shimmer 1.4s infinite',
        eq: 'eq 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
