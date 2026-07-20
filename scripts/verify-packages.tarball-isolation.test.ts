import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from './lib/run-command'
import { findWorkspacePackages } from './package-discovery'
import { verifyPackage } from './verify-package'
import { verifyPackages } from './verify-packages'

// Only the actual side-effecting boundary (spawning `pnpm`) is mocked here.
// packPackage, findTarball and readPackageJson run for real, so this test
// exercises the real interaction between packing multiple workspace
// packages and resolving each one's own tarball afterwards. This is a
// regression test: packing every package into one shared directory used
// to let findTarball() pick up a sibling package's tarball by mistake.
//
// It uses a large, generically-named, arbitrarily-located set of fake
// packages on purpose — findWorkspacePackages is mocked to return whatever
// paths we give it, so this proves the isolation logic scales to any
// package count and any location under the workspace, not just the two
// real packages that happen to exist today (packages/request/axios and
// packages/request/core). Adding a future package anywhere under
// packages/** (e.g. packages/ACL/permission) needs zero changes here.
vi.mock('./lib/run-command', () => ({
  runCommand: vi.fn()
}))

vi.mock('./package-discovery', () => ({
  findWorkspacePackages: vi.fn()
}))

vi.mock('./verify-package', () => ({
  verifyPackage: vi.fn()
}))

const mockedRunCommand = vi.mocked(runCommand)
const mockedFindPackages = vi.mocked(findWorkspacePackages)
const mockedVerifyPackage = vi.mocked(verifyPackage)

interface FakePackage {
  name: string
  directory: string
  tarballName: string
}

function createFakePackage(index: number): FakePackage {
  const name = `@codeminity/fake-package-${String(index)}`
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `fake-package-${String(index)}-`))

  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name }))

  return {
    name,
    directory,
    tarballName: `fake-package-${String(index)}-0.0.${String(index)}.tgz`
  }
}

const PACKAGE_COUNT = 100

describe('verifyPackages tarball isolation (regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`resolves each of ${String(PACKAGE_COUNT)} packages to its own tarball, never a sibling's`, async () => {
    const fakePackages = Array.from({ length: PACKAGE_COUNT }, (_, index) =>
      createFakePackage(index)
    )

    const directoryToPackage = new Map(
      fakePackages.map((pkg) => [path.resolve(pkg.directory), pkg])
    )

    mockedFindPackages.mockReturnValue(fakePackages.map((pkg) => pkg.directory))

    mockedRunCommand.mockImplementation((command, args = [], options) => {
      if (command === 'pnpm' && args.includes('pack')) {
        const destinationIndex = args.indexOf('--pack-destination')
        const destination = args[destinationIndex + 1]

        if (!destination) {
          throw new Error('Missing pack destination')
        }

        const pkg = options?.cwd ? directoryToPackage.get(options.cwd) : undefined

        if (!pkg) {
          throw new Error(`Unexpected pack cwd: ${String(options?.cwd)}`)
        }

        fs.writeFileSync(path.join(destination, pkg.tarballName), '')

        return Promise.resolve()
      }

      return Promise.resolve()
    })

    mockedVerifyPackage.mockResolvedValue(undefined)

    await verifyPackages()

    expect(mockedVerifyPackage).toHaveBeenCalledTimes(PACKAGE_COUNT)

    // Every verifyPackage call received the same, fully-resolved map — check
    // ALL of them, not just the call for "this" package, since the original
    // bug corrupted entries for packages other than the one being packed.
    for (const call of mockedVerifyPackage.mock.calls) {
      const localPackages = call[0].localPackages

      for (const pkg of fakePackages) {
        const resolvedTarball = localPackages?.get(pkg.name)

        expect(resolvedTarball).toBeDefined()
        expect(path.basename(resolvedTarball ?? '')).toBe(pkg.tarballName)
      }
    }

    // No two packages ever resolved to the exact same tarball path.
    const [firstCall] = mockedVerifyPackage.mock.calls
    const resolvedPaths = fakePackages.map((pkg) => firstCall?.[0].localPackages?.get(pkg.name))

    expect(new Set(resolvedPaths).size).toBe(PACKAGE_COUNT)

    for (const pkg of fakePackages) {
      fs.rmSync(pkg.directory, { recursive: true, force: true })
    }
  })
})
