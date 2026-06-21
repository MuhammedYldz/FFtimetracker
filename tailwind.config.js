/** @type {import('tailwindcss').Config} */

// Semantic color tokens map to CSS variables defined in src/global.css.
// Each variable holds space-separated RGB channels so Tailwind's
// <alpha-value> opacity modifiers (e.g. bg-primary/50) keep working.
const withVar = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

const SEMANTIC_COLORS = [
  'background',
  'surface',
  'surface-dim',
  'surface-bright',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'surface-variant',
  'on-surface',
  'on-surface-variant',
  'on-background',
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'primary-fixed',
  'primary-fixed-dim',
  'secondary',
  'on-secondary',
  'secondary-container',
  'on-secondary-container',
  'secondary-fixed',
  'secondary-fixed-dim',
  'tertiary',
  'on-tertiary',
  'tertiary-container',
  'on-tertiary-container',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'outline',
  'outline-variant',
  'inverse-surface',
  'inverse-on-surface',
  'inverse-primary',
];

const colors = Object.fromEntries(SEMANTIC_COLORS.map((c) => [c, withVar(c)]));

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      spacing: {
        base: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        gutter: '20px',
        lg: '24px',
        xl: '32px',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        // Distinctive display family for headings and the wordmark.
        display: ['Sora_600SemiBold'],
        'display-bold': ['Sora_700Bold'],
        mono: ['JetBrainsMono_500Medium'],
      },
      fontSize: {
        'label-md': ['12px', { lineHeight: '16px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'body-md': ['16px', { lineHeight: '24px' }],
        'body-lg': ['18px', { lineHeight: '28px' }],
        'headline-sm': ['20px', { lineHeight: '28px' }],
        'headline-md': ['24px', { lineHeight: '32px' }],
        'headline-lg': ['32px', { lineHeight: '40px' }],
        'timer': ['48px', { lineHeight: '56px' }],
        'display': ['56px', { lineHeight: '64px' }],
      },
    },
  },
  plugins: [],
};
