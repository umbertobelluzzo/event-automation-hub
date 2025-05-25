/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
      './frontend/pages/**/*.{ts,tsx}',
      './frontend/components/**/*.{ts,tsx}',
      './frontend/app/**/*.{ts,tsx}',
      './frontend/src/**/*.{ts,tsx}',
    ],
    theme: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          '2xl': '1400px',
        },
      },
      extend: {
        colors: {
          // UIS Brand Colors
          primary: {
            50: '#f0f9ff',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
          },
          // Italian Flag Colors for accents
          italian: {
            green: '#009246',
            red: '#ce2b37',
            white: '#ffffff',
          },
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
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
          popover: {
            DEFAULT: 'hsl(var(--popover))',
            foreground: 'hsl(var(--popover-foreground))',
          },
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))',
          },
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
        keyframes: {
          'accordion-down': {
            from: { height: 0 },
            to: { height: 'var(--radix-accordion-content-height)' },
          },
          'accordion-up': {
            from: { height: 'var(--radix-accordion-content-height)' },
            to: { height: 0 },
          },
          'fade-in': {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          'slide-in': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(0)' },
          },
          'pulse-slow': {
            '0%, 100%': { opacity: '1' },
            '50%': { opacity: '0.5' },
          },
        },
        animation: {
          'accordion-down': 'accordion-down 0.2s ease-out',
          'accordion-up': 'accordion-up 0.2s ease-out',
          'fade-in': 'fade-in 0.3s ease-out',
          'slide-in': 'slide-in 0.3s ease-out',
          'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        fontFamily: {
          sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
          mono: ['var(--font-mono)', 'Consolas', 'monospace'],
        },
      },
    },
    plugins: [require('tailwindcss-animate'), require('@tailwindcss/forms')],
  };