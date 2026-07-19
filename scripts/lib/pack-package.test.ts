import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { findTarball, packPackage } from './pack-package'
import { runCommand } from './run-command'

vi.mock('./run-command', () => ({
  runCommand: vi.fn()
}))

const mockedRunCommand = vi.mocked(runCommand)

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pack-package-test-'))
}

describe('findTarball', () => {
  it('returns the path of the generated tarball', () => {
    const directory = createTempDir()

    fs.writeFileSync(path.join(directory, 'package-0.0.0.tgz'), '')

    expect(findTarball(directory)).toBe(path.join(directory, 'package-0.0.0.tgz'))
  })

  it('throws when no tarball was generated', () => {
    const directory = createTempDir()

    expect(() => findTarball(directory)).toThrow('Package tarball was not generated')
  })

  it('throws when more than one tarball is found', () => {
    const directory = createTempDir()

    fs.writeFileSync(path.join(directory, 'package-a-0.0.0.tgz'), '')
    fs.writeFileSync(path.join(directory, 'package-b-0.0.0.tgz'), '')

    expect(() => findTarball(directory)).toThrow('Expected exactly one tarball')
  })
})

describe('packPackage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('packs the package and returns the tarball path', async () => {
    const outputDir = createTempDir()

    mockedRunCommand.mockImplementation((command, args = []) => {
      if (command === 'pnpm' && args.includes('pack')) {
        fs.writeFileSync(path.join(outputDir, 'package-0.0.0.tgz'), '')
      }

      return Promise.resolve()
    })

    const tarball = await packPackage('packages/request/core', outputDir)

    expect(tarball).toBe(path.join(outputDir, 'package-0.0.0.tgz'))

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['pack', '--pack-destination', outputDir],
      { cwd: path.resolve('packages/request/core') }
    )
  })

  it('propagates a pack failure', async () => {
    mockedRunCommand.mockRejectedValue(new Error('pack failed'))

    await expect(packPackage('packages/request/core', createTempDir())).rejects.toThrow(
      'pack failed'
    )
  })
})
