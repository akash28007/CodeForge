/** @type {import('tailwindcss').Config} */

// Maps the CSS custom properties defined in src/index.css onto Tailwind color names.
// `<alpha-value>` is what lets `bg-surface/60`, `text-accent/70` etc. work.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // surfaces
        // NOTE: named `canvas`, not `base` — a `base` color key would emit a
        // `.text-base` rule that collides with Tailwind's built-in font-size utility.
        canvas: token('base'),
        surface: token('surface'),
        raised: token('raised'),
        subtle: token('subtle'),
        // text
        primary: token('primary'),
        secondary: token('secondary'),
        muted: token('muted'),
        // brand
        // Foreground for anything sitting on an accent fill. With a light accent the
        // legible choice is near-black, with a dark one it is white — the token holds
        // that decision so components never hard-code `text-white`.
        'on-accent': token('on-accent'),
        // Secondary accent, the magenta end of the brand gradient. Exists so chips,
        // badges and figures have somewhere to go other than the one blue.
        accent2: token('accent-2'),
        // Difficulty fills for charts. Identical in both themes — see index.css.
        barEasy: token('bar-easy'),
        barMedium: token('bar-medium'),
        barHard: token('bar-hard'),
        accent: {
          DEFAULT: token('accent'),
          soft: token('accent-soft'),
        },
        // difficulty (0.2 — consistent everywhere, no exceptions)
        easy: token('easy'),
        medium: token('medium'),
        hard: token('hard'),
        // verdict extras
        error: token('error'),
        info: token('info'),
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.35), 0 0 24px rgb(var(--c-accent) / 0.22)',
        panel: '0 8px 30px rgb(0 0 0 / 0.45)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        pop: 'pop 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
