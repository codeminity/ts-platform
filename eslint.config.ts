import js from '@eslint/js'
import vitest from '@vitest/eslint-plugin'
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
      'import-x/no-internal-modules': 'off',
      // `import-x/no-cycle`'s resolver crashes outright ("node with invalid
      // interface loaded as resolver") walking apps/ui-kit-docs/vite.config.ts's
      // `vite` import — the first Vite config in this repo, everywhere else
      // uses tsup/tsc. Not a real violation to fix; config files are leaf
      // files with no meaningful cycle risk to check anyway.
      'import-x/no-cycle': 'off'
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
    plugins: {
      vitest
    },
    rules: {
      '@typescript-eslint/unbound-method': 'off',

      // Catches a test body with no `expect()` call at all — the classic
      // shape of a test that runs code but never actually asserts anything.
      'vitest/expect-expect': 'error',

      // Genuine test-integrity rules — each catches a real "fake" or
      // silently-broken test shape, not a style preference.
      'vitest/no-conditional-expect': 'error',
      'vitest/no-standalone-expect': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/valid-expect': 'error',
      'vitest/valid-expect-in-promise': 'error',
      'vitest/no-import-node-test': 'error',
      'vitest/no-commented-out-tests': 'error',
      'vitest/valid-describe-callback': 'error',
      'vitest/valid-title': 'error',
      'vitest/no-mocks-import': 'error',
      'vitest/no-unneeded-async-expect-function': 'error',
      'vitest/prefer-called-exactly-once-with': 'error',
      'vitest/unbound-method': 'error',
      'vitest/no-conditional-in-test': 'error',
      'vitest/require-hook': 'error',
      'vitest/require-to-throw-message': 'error',
      'vitest/prefer-expect-type-of': 'error',

      // `toStrictEqual` also checks undefined properties and prototype/class
      // identity, which `toEqual` silently ignores — catches real equality
      // bugs `toEqual` would miss, not just a style preference.
      'vitest/prefer-strict-equal': 'error',

      // `vi.mock(import('./x'))` over `vi.mock('./x')` — the dynamic import
      // form gives the mock factory real type information for the module
      // being mocked, instead of an untyped string path.
      'vitest/prefer-import-in-mock': 'error',

      // `vi.fn<Signature>()` over a bare `vi.fn()` — an untyped mock is
      // `(...args: any[]) => any`, so a call with the wrong arguments or a
      // wrong `mockReturnValue`/`mockResolvedValue` type goes uncaught.
      'vitest/require-mock-type-parameters': 'error'
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
