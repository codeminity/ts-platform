import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import importX from 'eslint-plugin-import-x'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**']
  },

  js.configs.recommended,
  eslintConfigPrettier,

  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // STRICT LAYER (ONLY TS FILES)
  {
    files: ['**/*.{ts,mts,cts}'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      parserOptions: {
        projectService: true
      },

      globals: {
        ...globals.node
      }
    },

    plugins: {
      'import-x': importX
    },

    rules: {
      // general
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',

      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

      // import
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],

          pathGroups: [
            {
              pattern: '@codeminity/**',
              group: 'internal',
              position: 'after'
            }
          ],

          pathGroupsExcludedImportTypes: ['builtin'],

          'newlines-between': 'always',

          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],

      'import-x/no-duplicates': 'error',
      'import-x/no-cycle': 'error',
      'import-x/no-relative-parent-imports': 'error',
      'import-x/no-internal-modules': 'error',

      // typescript
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports'
        }
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // Turn off noisy/obsolete rules for modern TS
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-empty-interface': 'off'
    }
  },

  // no-restricted-imports
  {
    files: ['packages/**/src/**/*.{ts,tsx}'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../**/src/**', '../../**/src/**']
        }
      ]
    }
  },

  // LIGHT LINT LAYER
  {
    files: ['**/*.config.*', '**/*.js', '**/*.mjs', '**/*.cjs'],

    languageOptions: {
      globals: {
        ...globals.node
      }
    },

    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off',
      'import-x/no-internal-modules': 'off'
    }
  },

  // scripts file
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'import-x/no-internal-modules': 'off',
      'import-x/no-cycle': 'off'
    }
  }
)
