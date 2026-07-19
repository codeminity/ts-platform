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

  it('reuses a provided tarball instead of packing the target package again', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    const writeSpy = vi.spyOn(fs, 'writeFileSync')

    const localPackages = new Map([
      ['ts-platform', '/tmp/ts-platform-0.0.0.tgz'],
      ['@codeminity/request-core', '/tmp/request-core-0.4.0.tgz']
    ])

    await expect(
      verifyPackage({
        packagePath: '.',
        localPackages
      })
    ).resolves.toBeUndefined()

    const packCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('pack')
    )

    expect(packCall).toBeUndefined()

    const addCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('add')
    )

    expect(addCall?.[1]?.[1]).toBe('/tmp/ts-platform-0.0.0.tgz')

    const workspaceYamlWrite = writeSpy.mock.calls.find(
      ([file]) => typeof file === 'string' && file.endsWith('pnpm-workspace.yaml')
    )

    expect(workspaceYamlWrite).toBeDefined()
    expect(workspaceYamlWrite?.[1]).toContain(
      '"@codeminity/request-core": "file:/tmp/request-core-0.4.0.tgz"'
    )
  })

  it('falls back to packing the package when it is missing from localPackages', async () => {
    mockPackCommand()

    const localPackages = new Map([['@codeminity/request-core', '/tmp/request-core-0.0.0.tgz']])

    await expect(
      verifyPackage({
        packagePath: '.',
        localPackages
      })
    ).resolves.toBeUndefined()

    const packCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('pack')
    )

    expect(packCall).toBeDefined()
  })

  it('omits pnpm overrides when no other local packages are known', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    const writeSpy = vi.spyOn(fs, 'writeFileSync')

    const localPackages = new Map([['ts-platform', '/tmp/ts-platform-0.0.0.tgz']])

    await expect(
      verifyPackage({
        packagePath: '.',
        localPackages
      })
    ).resolves.toBeUndefined()

    const workspaceYamlWrite = writeSpy.mock.calls.find(
      ([file]) => typeof file === 'string' && file.endsWith('pnpm-workspace.yaml')
    )

    expect(workspaceYamlWrite).toBeUndefined()
  })
})
