/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader Variable"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
        read: ['var(--font-read)'],
      },
      // Role-based tokens backed by CSS variables (see theme/themes.ts).
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          surface: 'rgb(var(--ink-surface) / <alpha-value>)',
          surface2: 'rgb(var(--ink-surface2) / <alpha-value>)',
        },
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          dim: 'rgb(var(--paper-dim) / <alpha-value>)',
          dimmer: 'rgb(var(--paper-dimmer) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
        },
      },
      boxShadow: {
        lift: '0 1px 0 rgb(255 255 255 / 0.03) inset, 0 8px 24px -12px rgb(0 0 0 / 0.5)',
        fab: '0 10px 30px -8px rgb(var(--accent) / 0.6)',
      },
      keyframes: {
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        'slide-up': 'slideUp 220ms cubic-bezier(.2,.8,.2,1)',
        'slide-in': 'slideIn 220ms cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fadeIn 220ms ease-out',
        fade: 'fade 160ms ease-out',
      },
    },
  },
  plugins: [],
}
