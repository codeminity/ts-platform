import { beforeEach, describe, expect, it, vi } from 'vitest'

import { packPackage } from '../lib/pack-package'
import { findWorkspacePackages } from '../lib/package-discovery'
import { readPackageJson } from '../lib/read-package-json'

import { verifyPackage } from './verify-package'
import { verifyPackages } from './verify-packages'

vi.mock(import('../lib/package-discovery'), () => ({
  findWorkspacePackages: vi.fn<typeof findWorkspacePackages>()
}))

vi.mock(import('./verify-package'), () => ({
  verifyPackage: vi.fn<typeof verifyPackage>()
}))

vi.mock(import('../lib/pack-package'), () => ({
  packPackage: vi.fn<typeof packPackage>()
}))

vi.mock(import('../lib/read-package-json'), () => ({
  readPackageJson: vi.fn<typeof readPackageJson>()
}))

const mockedFindPackages = vi.mocked(findWorkspacePackages)
const mockedVerifyPackage = vi.mocked(verifyPackage)
const mockedPackPackage = vi.mocked(packPackage)
const mockedReadPackageJson = vi.mocked(readPackageJson)

function mockPackageNames(names: Record<string, string>) {
  mockedReadPackageJson.mockImplementation((packagePath) => ({
    name: names[packagePath] ?? 'unknown'
  }))
}

function mockTarballs(tarballs: Record<string, string>) {
  mockedPackPackage.mockImplementation((packagePath) =>
    Promise.resolve(tarballs[packagePath] ?? '')
  )
}

describe(verifyPackages, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('packs every discovered package before verifying any of them', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core', 'packages/request/axios'])

    mockPackageNames({
      'packages/request/core': '@codeminity/request-core',
      'packages/request/axios': '@codeminity/axios'
    })

    mockTarballs({
      'packages/request/core': '/tmp/tarballs/request-core.tgz',
      'packages/request/axios': '/tmp/tarballs/axios.tgz'
    })

    mockedVerifyPackage.mockResolvedValue(undefined)

    await expect(verifyPackages()).resolves.toBeUndefined()

    expect(mockedPackPackage).toHaveBeenCalledTimes(2)
    expect(mockedVerifyPackage).toHaveBeenCalledTimes(2)

    const expectedLocalPackages = new Map([
      ['@codeminity/request-core', '/tmp/tarballs/request-core.tgz'],
      ['@codeminity/axios', '/tmp/tarballs/axios.tgz']
    ])

    expect(mockedVerifyPackage).toHaveBeenNthCalledWith(1, {
      packagePath: 'packages/request/core',
      localPackages: expectedLocalPackages
    })

    expect(mockedVerifyPackage).toHaveBeenNthCalledWith(2, {
      packagePath: 'packages/request/axios',
      localPackages: expectedLocalPackages
    })
  })

  it('starts verifying every discovered package without waiting for an earlier one to finish', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core', 'packages/request/axios'])

    mockPackageNames({
      'packages/request/core': '@codeminity/request-core',
      'packages/request/axios': '@codeminity/axios'
    })

    mockTarballs({
      'packages/request/core': '/tmp/tarballs/request-core.tgz',
      'packages/request/axios': '/tmp/tarballs/axios.tgz'
    })

    const started: string[] = []
    let resolveCore: () => void = () => {
      /* empty */
    }
    const coreGate = new Promise<void>((resolve) => {
      resolveCore = resolve
    })

    mockedVerifyPackage.mockImplementation(({ packagePath }) => {
      started.push(packagePath)
      return packagePath === 'packages/request/core' ? coreGate : Promise.resolve()
    })

    const resultPromise = verifyPackages()

    // axios's verification should have started even though core's own
    // verifyPackage call is still pending — proves these run concurrently,
    // not one-after-another.
    await vi.waitFor(() => {
      expect(started).toContain('packages/request/axios')
    })

    expect(started).toContain('packages/request/core')

    resolveCore()
    await resultPromise
  })

  it('starts packing every discovered package without waiting for an earlier one to finish', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core', 'packages/request/axios'])

    mockPackageNames({
      'packages/request/core': '@codeminity/request-core',
      'packages/request/axios': '@codeminity/axios'
    })

    const started: string[] = []
    let resolveCore: (() => void) | undefined
    const coreGate = new Promise<string>((resolve) => {
      resolveCore = () => {
        resolve('/tmp/tarballs/request-core.tgz')
      }
    })

    mockedPackPackage.mockImplementation((packagePath) => {
      started.push(packagePath)
      return packagePath === 'packages/request/core'
        ? coreGate
        : Promise.resolve('/tmp/tarballs/axios.tgz')
    })

    mockedVerifyPackage.mockResolvedValue(undefined)

    const resultPromise = verifyPackages()

    await vi.waitFor(() => {
      expect(started).toContain('packages/request/axios')
    })

    expect(started).toContain('packages/request/core')

    resolveCore?.()
    await resultPromise
  })

  it('does nothing when no packages exist', async () => {
    mockedFindPackages.mockReturnValue([])

    await expect(verifyPackages()).resolves.toBeUndefined()

    expect(mockedPackPackage).not.toHaveBeenCalled()
    expect(mockedVerifyPackage).not.toHaveBeenCalled()
  })

  it('throws when packing a package fails', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core'])

    mockPackageNames({ 'packages/request/core': '@codeminity/request-core' })

    mockedPackPackage.mockRejectedValue(new Error('pack failed'))

    await expect(verifyPackages()).rejects.toThrow('pack failed')

    expect(mockedVerifyPackage).not.toHaveBeenCalled()
  })

  it('throws when one package verification fails', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core'])

    mockPackageNames({ 'packages/request/core': '@codeminity/request-core' })
    mockTarballs({ 'packages/request/core': '/tmp/tarballs/request-core.tgz' })

    mockedVerifyPackage.mockRejectedValue(new Error('verification failed'))

    await expect(verifyPackages()).rejects.toThrow('verification failed')
  })
})
