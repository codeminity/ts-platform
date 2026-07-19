import { beforeEach, describe, expect, it, vi } from 'vitest'

import { packPackage } from './lib/pack-package'
import { readPackageJson } from './lib/read-package-json'
import { findWorkspacePackages } from './package-discovery'
import { verifyPackage } from './verify-package'
import { verifyPackages } from './verify-packages'

vi.mock('./package-discovery', () => ({
  findWorkspacePackages: vi.fn()
}))

vi.mock('./verify-package', () => ({
  verifyPackage: vi.fn()
}))

vi.mock('./lib/pack-package', () => ({
  packPackage: vi.fn()
}))

vi.mock('./lib/read-package-json', () => ({
  readPackageJson: vi.fn()
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

describe('verifyPackages', () => {
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

  it('verifies packages sequentially', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core', 'packages/request/axios'])

    mockPackageNames({
      'packages/request/core': '@codeminity/request-core',
      'packages/request/axios': '@codeminity/axios'
    })

    mockTarballs({
      'packages/request/core': '/tmp/tarballs/request-core.tgz',
      'packages/request/axios': '/tmp/tarballs/axios.tgz'
    })

    const calls: string[] = []

    mockedVerifyPackage.mockImplementation(({ packagePath }) => {
      calls.push(packagePath)

      return Promise.resolve()
    })

    await verifyPackages()

    expect(calls).toEqual(['packages/request/core', 'packages/request/axios'])
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
