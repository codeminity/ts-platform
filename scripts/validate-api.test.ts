import fs from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractExportsFromSource, hasTypeExport } from './lib/api-exports'
import { loadRuntimeModule } from './lib/load-runtime-module'
import { validatePackages } from './validate-api'

vi.mock('globby', () => ({
  globby: vi.fn().mockResolvedValue(['packages/request/core/package.json'])
}))

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),

    readFileSync: vi.fn((file) => {
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
  }
}))

vi.mock('./lib/load-runtime-module', () => ({
  loadRuntimeModule: vi.fn()
}))

vi.mock('./lib/api-exports', () => ({
  extractExportsFromSource: vi.fn(),
  hasTypeExport: vi.fn()
}))

describe('validate-api', () => {
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
      delay: vi.fn()
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
      another: vi.fn()
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
      delay: vi.fn(),
      second: vi.fn()
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
})
