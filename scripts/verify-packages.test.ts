import { beforeEach, describe, expect, it, vi } from 'vitest'

import { findWorkspacePackages } from './package-discovery'
import { verifyPackage } from './verify-package'
import { verifyPackages } from './verify-packages'

vi.mock('./package-discovery', () => ({
  findWorkspacePackages: vi.fn()
}))

vi.mock('./verify-package', () => ({
  verifyPackage: vi.fn()
}))

const mockedFindPackages = vi.mocked(findWorkspacePackages)
const mockedVerifyPackage = vi.mocked(verifyPackage)

describe('verifyPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verifies all discovered packages', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core', 'packages/request/axios'])

    mockedVerifyPackage.mockResolvedValue(undefined)

    await expect(verifyPackages()).resolves.toBeUndefined()

    expect(mockedVerifyPackage).toHaveBeenCalledTimes(2)

    expect(mockedVerifyPackage).toHaveBeenNthCalledWith(1, {
      packagePath: 'packages/request/core'
    })

    expect(mockedVerifyPackage).toHaveBeenNthCalledWith(2, {
      packagePath: 'packages/request/axios'
    })
  })

  it('verifies packages sequentially', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core', 'packages/request/axios'])

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

    expect(mockedVerifyPackage).not.toHaveBeenCalled()
  })

  it('throws when one package verification fails', async () => {
    mockedFindPackages.mockReturnValue(['packages/request/core'])

    mockedVerifyPackage.mockRejectedValue(new Error('verification failed'))

    await expect(verifyPackages()).rejects.toThrow('verification failed')
  })
})
