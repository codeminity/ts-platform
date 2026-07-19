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

function createFakePackage(name: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-package-'))

  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name }))

  return directory
}

describe('verifyPackages tarball isolation (regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves each package to its own tarball, not a sibling package tarball', async () => {
    const corePath = createFakePackage('@codeminity/request-core')
    const axiosPath = createFakePackage('@codeminity/axios')

    mockedFindPackages.mockReturnValue([axiosPath, corePath])

    mockedRunCommand.mockImplementation((command, args = [], options) => {
      if (command === 'pnpm' && args.includes('pack')) {
        const destinationIndex = args.indexOf('--pack-destination')
        const destination = args[destinationIndex + 1]

        if (!destination) {
          throw new Error('Missing pack destination')
        }

        const isCore = options?.cwd === path.resolve(corePath)

        const tarballName = isCore ? 'request-core-0.4.0.tgz' : 'axios-0.4.0.tgz'

        fs.writeFileSync(path.join(destination, tarballName), '')

        return Promise.resolve()
      }

      return Promise.resolve()
    })

    mockedVerifyPackage.mockResolvedValue(undefined)

    await verifyPackages()

    const [axiosCall, coreCall] = mockedVerifyPackage.mock.calls

    const axiosLocalPackages = axiosCall[0].localPackages
    const coreLocalPackages = coreCall[0].localPackages

    expect(axiosLocalPackages?.get('@codeminity/axios')).toMatch(/axios-0\.4\.0\.tgz$/)
    expect(axiosLocalPackages?.get('@codeminity/request-core')).toMatch(
      /request-core-0\.4\.0\.tgz$/
    )

    // Both calls share the same map instance/content — the important
    // regression check is that neither entry ever points at the wrong file.
    expect(coreLocalPackages?.get('@codeminity/axios')).toMatch(/axios-0\.4\.0\.tgz$/)
    expect(coreLocalPackages?.get('@codeminity/request-core')).toMatch(/request-core-0\.4\.0\.tgz$/)

    fs.rmSync(corePath, { recursive: true, force: true })
    fs.rmSync(axiosPath, { recursive: true, force: true })
  })
})
