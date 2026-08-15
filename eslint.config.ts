import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import importX from 'eslint-plugin-import-x'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/.stryker-tmp/**',
      '**/reports/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/sbom/**'
    ]
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
      'import-x/no-internal-modules': [
        'error',
        {
          allow: ['@codeminity/*/test-utils']
        }
      ],

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
  },

  // test file
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off'
    }
  },

  // e2e browser fixtures deliberately import a package's own built `dist/`
  // output via a real relative import (not just a URL string passed to
  // `bundlePackageForBrowser`, which is how every *.spec.ts file itself
  // references dist/ without needing this exception at all) — that's the
  // whole point of a fixture: bundling real code that imports from `dist/`
  // mirrors what a real consumer's own bundler sees, which is exactly what
  // an e2e test needs to prove.
  //
  // A self-referencing package import (`@codeminity/ui-kit/vue` via a
  // `workspace:*` self-devDependency) was tried as a way to avoid this
  // exception entirely, since it isn't a relative import at all — rejected:
  // both rules below still fire on it anyway (their resolvers see through
  // the self-reference symlink to the real, physically-parent filesystem
  // path), so it added a whole extra moving part (the package depending on
  // itself) without actually avoiding the need for this override.
  {
    files: ['packages/**/e2e/fixtures/**/*.ts'],
    rules: {
      'import-x/no-relative-parent-imports': 'off',
      'import-x/no-internal-modules': 'off'
    }
  }
)
