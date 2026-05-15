import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        // Brand tokens (current — pending Sugar Art delivery)
        chop: {
          orange: '#E8570A',
          'orange-dark': '#B8400A',
          'orange-light': '#FFF0E8',
          ink: '#0F0F0F',
          'ink-secondary': '#4A4A47',
          warm: '#FAFAF7',
          'card-white': '#FFFFFF',
          'surface-gray': '#F4F4F1',
          mboue: '#1A5C3A',
          'mboue-light': '#E8F5EE',
          danger: '#D93025',
          'danger-light': '#FFEDED',
          neutral: '#9A9A95',
          // Rider outdoor dark palette
          'deep-ink': '#0F0F0F',
          'dark-surface': '#1A1A1A',
          'dark-elevated': '#252525',
          'dark-border': '#333333',
        },
        // Direct divider token for borders not themed via shadcn vars.
        divider: '#E8E8E3',
        // Payment-method specific brand colors (DESIGN.md §2 + §4).
        mtn: { DEFAULT: '#FFCB00', light: '#FFF9E0' },
        'orange-money': { DEFAULT: '#FF6600', light: '#FFF3E8' },
        cash: { DEFAULT: '#2E7D32', light: '#E8F5EE' },
      },
      boxShadow: {
        card: 'rgba(15, 15, 15, 0.08) 0px 2px 8px',
        elevated: 'rgba(15, 15, 15, 0.14) 0px 4px 16px',
        modal: 'rgba(15, 15, 15, 0.32) 0px 8px 32px',
        rider: 'rgba(0, 0, 0, 0.50) 0px 4px 16px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [animate],
};

export default config;
