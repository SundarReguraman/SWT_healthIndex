/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ground: '#0B0D10',
        panel: '#12151A',
        well: '#0E1115',
        line: '#1F242C',
        edge: '#2A3039',
        ink: '#E6E8EB',
        sub: '#C2C9D3',
        muted: '#8A93A0',
        water: { DEFAULT: '#5CC8F0', light: '#9BE0F7', mid: '#3A9AC2', deep: '#2A6A88' },
      },
      keyframes: {
        drift: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: { drift: 'drift 6s linear infinite' },
    },
  },
  plugins: [],
};
