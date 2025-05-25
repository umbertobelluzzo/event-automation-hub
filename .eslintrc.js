module.exports = {
    root: true,
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      'next/core-web-vitals',
      'airbnb',
      'airbnb-typescript',
      'prettier',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: ['./tsconfig.json', './frontend/tsconfig.json', './backend/tsconfig.json'],
      tsconfigRootDir: __dirname,
    },
    plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import'],
    rules: {
      // =============================================================================
      // TypeScript Specific Rules
      // =============================================================================
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'off',
  
      // =============================================================================
      // React Specific Rules
      // =============================================================================
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js 13+
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/jsx-props-no-spreading': 'off', // Common pattern with form libraries
      'react/require-default-props': 'off', // Not needed with TypeScript
      'react/jsx-filename-extension': [
        'warn',
        {
          extensions: ['.tsx', '.jsx'],
        },
      ],
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
  
      // =============================================================================
      // Import/Export Rules
      // =============================================================================
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'never',
          tsx: 'never',
          js: 'never',
          jsx: 'never',
        },
      ],
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
            '**/tests/**/*',
            '**/test-utils/**/*',
            '**/__tests__/**/*',
            '**/vitest.config.ts',
            '**/playwright.config.ts',
            '**/next.config.js',
            '**/tailwind.config.js',
          ],
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
        },
      ],
  
      // =============================================================================
      // General Code Quality Rules
      // =============================================================================
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-nested-ternary': 'error',
      'consistent-return': 'off', // TypeScript handles this better
      'no-underscore-dangle': [
        'error',
        {
          allow: ['_id', '__typename', '__DEV__'],
        },
      ],
  
      // =============================================================================
      // Airbnb Overrides for Our Use Case
      // =============================================================================
      'jsx-a11y/anchor-is-valid': 'off', // Next.js Link component
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'max-len': [
        'error',
        {
          code: 100,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreComments: false,
          ignoreRegExpLiterals: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
  
      // =============================================================================
      // Project Specific Rules
      // =============================================================================
      // TODO comments are allowed during development
      'no-warning-comments': [
        'warn',
        {
          terms: ['fixme', 'hack'],
          location: 'start',
        },
      ],
  
      // Allow empty functions for event handlers and optional callbacks
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions', 'methods'],
        },
      ],
  
      // Allow dev dependencies in config files
      'import/no-dev-dependencies': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json', './frontend/tsconfig.json', './backend/tsconfig.json'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    overrides: [
      // =============================================================================
      // Frontend Specific Rules (Next.js)
      // =============================================================================
      {
        files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
        extends: ['next/core-web-vitals'],
        rules: {
          // Next.js specific overrides
          '@next/next/no-html-link-for-pages': 'off',
          '@next/next/no-img-element': 'warn',
          
          // Allow default exports for pages and API routes
          'import/prefer-default-export': ['error'],
          
          // React Server Components
          'react/jsx-no-leaked-render': 'error',
        },
      },
  
      // =============================================================================
      // Backend Specific Rules (Express API)
      // =============================================================================
      {
        files: ['backend/**/*.ts'],
        env: {
          node: true,
          browser: false,
        },
        rules: {
          // Node.js specific
          'no-console': 'off', // Console logging is acceptable in backend
          'import/prefer-default-export': 'off',
          
          // Express patterns
          'consistent-return': 'off',
          '@typescript-eslint/no-misused-promises': [
            'error',
            {
              checksVoidReturn: false,
            },
          ],
        },
      },
  
      // =============================================================================
      // Test Files
      // =============================================================================
      {
        files: [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/tests/**/*',
          '**/__tests__/**/*',
        ],
        env: {
          jest: true,
          'vitest-globals/env': true,
        },
        extends: ['plugin:vitest-globals/recommended'],
        rules: {
          // Test files can have more relaxed rules
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/no-non-null-assertion': 'off',
          'import/no-extraneous-dependencies': 'off',
          'no-console': 'off',
          'max-len': 'off',
          
          // Testing patterns
          'prefer-arrow-callback': 'off',
          'func-names': 'off',
        },
      },
  
      // =============================================================================
      // Configuration Files
      // =============================================================================
      {
        files: [
          '*.config.js',
          '*.config.ts',
          '.eslintrc.js',
          'tailwind.config.js',
          'next.config.js',
          'vitest.config.ts',
          'playwright.config.ts',
        ],
        rules: {
          'import/no-extraneous-dependencies': 'off',
          '@typescript-eslint/no-var-requires': 'off',
          'no-console': 'off',
        },
      },
  
      // =============================================================================
      // Shared Types and Utilities
      // =============================================================================
      {
        files: ['shared/**/*.ts'],
        rules: {
          'import/prefer-default-export': 'off',
          '@typescript-eslint/no-explicit-any': 'warn', // More flexible for shared types
        },
      },
    ],
    ignorePatterns: [
      'node_modules/',
      'dist/',
      'build/',
      '.next/',
      'coverage/',
      '*.min.js',
      'public/',
      '.env*',
      'pnpm-lock.yaml',
      'yarn.lock',
      'package-lock.json',
    ],
  };