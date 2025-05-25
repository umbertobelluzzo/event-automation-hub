// =============================================================================
// tailwind.config.js - Tailwind CSS Configuration
// =============================================================================
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
          'accordion-down': 'accordion-down, 0.2s ease-out',
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
  
  // =============================================================================
  // next.config.js - Next.js Configuration
  // =============================================================================
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    typescript: {
      // Dangerously allow production builds to successfully complete even if
      // your project has ESLint errors during development only
      ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },
    eslint: {
      // Warning: This allows production builds to successfully complete even if
      // your project has ESLint errors.
      ignoreDuringBuilds: process.env.NODE_ENV === 'development',
    },
    experimental: {
      serverComponentsExternalPackages: ['@prisma/client'],
    },
    images: {
      domains: [
        'export-download.canva.com',
        'drive.google.com',
        'lh3.googleusercontent.com',
      ],
    },
    env: {
      CUSTOM_KEY: process.env.CUSTOM_KEY,
    },
    // API routes configuration
    async rewrites() {
      return [
        {
          source: '/api/backend/:path*',
          destination: `${process.env.BACKEND_URL || 'http://localhost:4000'}/:path*`,
        },
        {
          source: '/api/agents/:path*',
          destination: `${process.env.AGENTS_URL || 'http://localhost:8000'}/:path*`,
        },
      ];
    },
    // Headers for CORS and security
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value:
                'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
            },
          ],
        },
      ];
    },
  };
  
  module.exports = nextConfig;
  
  // =============================================================================
  // vitest.config.ts - Vitest Testing Configuration
  // =============================================================================
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  import { resolve } from 'path';
  
  export default defineConfig({
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/e2e/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'tests/',
          '**/*.d.ts',
          '**/*.config.{js,ts}',
          '**/coverage/**',
          '**/dist/**',
          '**/.next/**',
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './frontend'),
        '@/components': resolve(__dirname, './frontend/components'),
        '@/lib': resolve(__dirname, './frontend/lib'),
        '@/hooks': resolve(__dirname, './frontend/hooks'),
        '@/shared': resolve(__dirname, './shared'),
        '@/backend': resolve(__dirname, './backend/src'),
      },
    },
  });
  
  // =============================================================================
  // Backend TypeScript Configuration (backend/tsconfig.json)
  // =============================================================================
  const backendTsConfig = {
    extends: '../tsconfig.json',
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      target: 'ES2022',
      module: 'CommonJS',
      lib: ['ES2022'],
      allowJs: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      strict: true,
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      noImplicitThis: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      moduleResolution: 'node',
      baseUrl: '.',
      paths: {
        '@/*': ['./src/*'],
        '@/shared/*': ['../shared/*'],
      },
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
    },
    include: ['src/**/*', '../shared/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
  };
  
  // =============================================================================
  // Frontend TypeScript Configuration (frontend/tsconfig.json)
  // =============================================================================
  const frontendTsConfig = {
    extends: '../tsconfig.json',
    compilerOptions: {
      target: 'ES2022',
      lib: ['dom', 'dom.iterable', 'ES6'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [
        {
          name: 'next',
        },
      ],
      baseUrl: '.',
      paths: {
        '@/*': ['./*'],
        '@/components/*': ['./components/*'],
        '@/lib/*': ['./lib/*'],
        '@/hooks/*': ['./hooks/*'],
        '@/shared/*': ['../shared/*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts', '../shared/**/*'],
    exclude: ['node_modules', '../node_modules'],
  };