import fs from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractExportsFromSource, hasTypeExport } from '../lib/api-exports'
import { loadRuntimeModule } from '../lib/load-runtime-module'

import { validatePackages } from './validate-api-exports'

import type { globby as Globby } from 'globby'

vi.mock(import('globby'), () => ({
  // `globby` is overloaded (an `objectMode`/`stats` options shape resolves
  // to `GlobEntry[]` instead) — only the plain string-array overload is
  // ever used here, so the mock is typed to just that one signature and
  // cast back to the full real type.
  globby: vi
    .fn<(patterns: string | readonly string[]) => Promise<string[]>>()
    .mockResolvedValue(['packages/request/core/package.json']) as unknown as typeof Globby
}))

vi.mock(import('node:fs'), () => ({
  // Only `fs.existsSync`/`fs.readFileSync` are ever called by the code under
  // test — the rest of the real `node:fs` shape is deliberately not part of
  // this mock.
  default: {
    existsSync: vi.fn<typeof fs.existsSync>(() => true),

    readFileSync: vi.fn<(file: fs.PathOrFileDescriptor) => string>((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/request-core'
        })
      }

      return `
        export { delay }
        export type { AuthConfig }
      `
    })
  } as unknown as typeof fs
}))

vi.mock(import('../lib/load-runtime-module'), () => ({
  loadRuntimeModule: vi.fn<typeof loadRuntimeModule>()
}))

vi.mock(import('../lib/api-exports'), () => ({
  extractExportsFromSource: vi.fn<typeof extractExportsFromSource>(),
  hasTypeExport: vi.fn<typeof hasTypeExport>()
}))

describe('validate-api-exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(fs.existsSync).mockReturnValue(true)

    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/request-core'
        })
      }

      return `
        export type { AuthConfig }
      `
    })

    vi.mocked(loadRuntimeModule).mockResolvedValue({
      delay: vi.fn<() => unknown>()
    })

    vi.mocked(extractExportsFromSource).mockReturnValue({
      runtime: ['delay'],
      types: ['AuthConfig']
    })

    vi.mocked(hasTypeExport).mockReturnValue(true)
  })

  it('validates package exports successfully', async () => {
    await expect(validatePackages()).resolves.not.toThrow()
  })

  it('fails when build output is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    await expect(validatePackages()).rejects.toThrow('Missing build output')
  })

  it('fails when runtime export is missing', async () => {
    vi.mocked(loadRuntimeModule).mockResolvedValue({
      another: vi.fn<() => unknown>()
    })

    vi.mocked(extractExportsFromSource).mockReturnValue({
      runtime: ['missingExport'],
      types: []
    })

    await expect(validatePackages()).rejects.toThrow('Missing runtime export missingExport')
  })

  it('fails when type export is missing', async () => {
    vi.mocked(extractExportsFromSource).mockReturnValue({
      runtime: [],
      types: ['MissingType']
    })

    vi.mocked(hasTypeExport).mockReturnValue(false)

    await expect(validatePackages()).rejects.toThrow('Missing type export MissingType')
  })

  it('uses fallback package name when package name is missing', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({})
      }

      return ''
    })

    await expect(validatePackages()).resolves.not.toThrow()
  })

  it('handles empty package list', async () => {
    const { globby } = await import('globby')

    vi.mocked(globby).mockResolvedValueOnce([])

    await expect(validatePackages()).resolves.not.toThrow()
  })

  it('skips type validation when declaration file is missing', async () => {
    vi.mocked(fs.existsSync).mockImplementation((file) => String(file).endsWith('index.js'))

    await expect(validatePackages()).resolves.not.toThrow()

    expect(hasTypeExport).not.toHaveBeenCalled()
  })

  it('validates multiple runtime exports', async () => {
    vi.mocked(extractExportsFromSource).mockReturnValue({
      runtime: ['delay', 'second'],
      types: []
    })

    vi.mocked(loadRuntimeModule).mockResolvedValue({
      delay: vi.fn<() => unknown>(),
      second: vi.fn<() => unknown>()
    })

    await expect(validatePackages()).resolves.not.toThrow()
  })

  it('validates multiple type exports', async () => {
    vi.mocked(extractExportsFromSource).mockReturnValue({
      runtime: [],
      types: ['AuthConfig', 'RetryConfig']
    })

    await expect(validatePackages()).resolves.not.toThrow()
  })

  it('validates every subpath in a multi-entry exports map, labeling each package/subpath', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/ui-kit',
          exports: {
            '.': { types: './dist/index.d.ts', import: './dist/index.js' },
            './vue': { types: './dist/vue/index.d.ts', import: './dist/vue/index.js' }
          }
        })
      }

      return `
        export type { AuthConfig }
      `
    })

    const result = await validatePackages()

    expect(result).toStrictEqual(['@codeminity/ui-kit', '@codeminity/ui-kit/vue'])
    expect(extractExportsFromSource).toHaveBeenCalledWith(expect.any(String), 'src/index.ts')
    expect(extractExportsFromSource).toHaveBeenCalledWith(expect.any(String), 'src/vue/index.ts')
  })

  it('reports the subpath in the error label when a subpath entry is missing its build output', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/ui-kit',
          exports: {
            '.': { types: './dist/index.d.ts', import: './dist/index.js' },
            './vue': { types: './dist/vue/index.d.ts', import: './dist/vue/index.js' }
          }
        })
      }

      return ''
    })
    vi.mocked(fs.existsSync).mockImplementation((file) => !String(file).includes('vue'))

    await expect(validatePackages()).rejects.toThrow('Missing build output: @codeminity/ui-kit/vue')
  })

  it('skips an exports entry with no import target (types-only subpath)', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/ui-kit',
          exports: { './types-only': { types: './dist/types-only.d.ts' } }
        })
      }

      return ''
    })

    const result = await validatePackages()

    expect(result).toStrictEqual([])
    expect(loadRuntimeModule).not.toHaveBeenCalled()
  })

  it('accepts a bare string export target with no types entry', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((file) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/ui-kit',
          exports: { '.': './dist/index.js' }
        })
      }

      return ''
    })
    vi.mocked(extractExportsFromSource).mockReturnValue({ runtime: [], types: ['AuthConfig'] })

    const result = await validatePackages()

    expect(result).toStrictEqual(['@codeminity/ui-kit'])
    expect(hasTypeExport).not.toHaveBeenCalled()
  })
})
