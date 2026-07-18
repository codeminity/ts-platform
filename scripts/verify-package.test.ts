import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from './lib/run-command'
import { verifyPackage } from './verify-package'

vi.mock('./lib/run-command', () => ({
  runCommand: vi.fn()
}))

const mockedRunCommand = vi.mocked(runCommand)

function mockPackCommand() {
  mockedRunCommand.mockImplementation((command, args = []) => {
    if (command === 'pnpm' && args.includes('pack')) {
      const destinationIndex = args.indexOf('--pack-destination')
      const destination = args[destinationIndex + 1]

      if (!destination) {
        throw new Error('Missing pack destination')
      }

      fs.writeFileSync(path.join(destination, 'test-package-0.0.0.tgz'), '')

      return Promise.resolve()
    }

    return Promise.resolve()
  })
}

function createTempPackage() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-package-test-'))

  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({}))

  return directory
}

describe('verifyPackage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('packs, installs and verifies package runtime import successfully', async () => {
    mockPackCommand()

    await expect(
      verifyPackage({
        packagePath: '.'
      })
    ).resolves.toBeUndefined()

    const packCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('pack')
    )

    expect(packCall).toBeDefined()
    expect(packCall?.[2]).toEqual(
      expect.objectContaining({
        cwd: path.resolve('.')
      })
    )

    const addCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('add')
    )

    expect(addCall).toBeDefined()
    expect(addCall?.[1]?.[1]).toContain('.tgz')

    const nodeCall = mockedRunCommand.mock.calls.find(([command]) => command === 'node')

    expect(nodeCall).toBeDefined()
    expect(nodeCall?.[1]?.[0]).toContain('index.mjs')
  })

  it('throws when tarball is not generated', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(
      verifyPackage({
        packagePath: '.'
      })
    ).rejects.toThrow('Package tarball was not generated')
  })

  it('throws when package installation fails', async () => {
    mockedRunCommand.mockImplementation((command, args = []) => {
      if (command === 'pnpm' && args.includes('pack')) {
        const destinationIndex = args.indexOf('--pack-destination')
        const destination = args[destinationIndex + 1]

        if (!destination) {
          throw new Error('Missing pack destination')
        }

        fs.writeFileSync(path.join(destination, 'test-package-0.0.0.tgz'), '')

        return Promise.resolve()
      }

      if (command === 'pnpm' && args.includes('add')) {
        return Promise.reject(new Error('install failed'))
      }

      return Promise.resolve()
    })

    await expect(
      verifyPackage({
        packagePath: '.'
      })
    ).rejects.toThrow('install failed')
  })

  it('throws when runtime import verification fails', async () => {
    mockedRunCommand.mockImplementation((command, args = []) => {
      if (command === 'pnpm' && args.includes('pack')) {
        const destinationIndex = args.indexOf('--pack-destination')
        const destination = args[destinationIndex + 1]

        if (!destination) {
          throw new Error('Missing pack destination')
        }

        fs.writeFileSync(path.join(destination, 'test-package-0.0.0.tgz'), '')

        return Promise.resolve()
      }

      if (command === 'node') {
        return Promise.reject(new Error('import failed'))
      }

      return Promise.resolve()
    })

    await expect(
      verifyPackage({
        packagePath: '.'
      })
    ).rejects.toThrow('import failed')
  })

  it('throws when package.json is invalid', async () => {
    const packagePath = createTempPackage()

    await expect(
      verifyPackage({
        packagePath
      })
    ).rejects.toThrow('Invalid package.json')
  })
})
