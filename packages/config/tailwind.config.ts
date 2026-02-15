import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A5C',
          50: '#EBF0F5',
          100: '#D7E1EB',
          200: '#AFC3D7',
          300: '#87A5C3',
          400: '#5F87AF',
          500: '#1B3A5C',
          600: '#183353',
          700: '#152C49',
          800: '#12253F',
          900: '#0F1E35',
        },
        secondary: {
          DEFAULT: '#2A9D8F',
          50: '#E8F5F3',
          100: '#D1EBE7',
          200: '#A3D7CF',
          300: '#75C3B7',
          400: '#47AF9F',
          500: '#2A9D8F',
          600: '#258E81',
          700: '#207E73',
          800: '#1B6F65',
          900: '#165F57',
        },
        success: '#27AE60',
        warning: '#F39C12',
        danger: '#C0392B',
        background: {
          primary: '#FFFFFF',
          secondary: '#F0F7FA',
        },
        text: {
          primary: '#1A1A2E',
          secondary: '#555555',
          muted: '#999999',
        },
        border: '#E8E8E8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      screens: {
        mobile: '640px',
        tablet: '1024px',
        desktop: '1280px',
        wide: '1536px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
