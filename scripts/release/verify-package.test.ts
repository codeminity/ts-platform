import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as esbuild from 'esbuild'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from '../lib/run-command'

import {
  readVersionFromPackageJson,
  verifyPackage,
  verifyTreeShakenSideEffect
} from './verify-package'

vi.mock(import('../lib/run-command'), () => ({
  runCommand: vi.fn<typeof runCommand>()
}))

// Mocked here because `verifyPackage`'s own tests below mock `runCommand`
// too — no real `pnpm add` ever runs, so there's nothing real for esbuild
// to resolve. `verifyTreeShakenSideEffect`'s own tests further down
// restore the real implementation (via `vi.importActual`) specifically
// because a mocked bundler couldn't prove the real behavior this check
// exists to verify.
vi.mock(import('esbuild'), () => ({
  build: vi.fn<typeof esbuild.build>()
}))

const mockedRunCommand = vi.mocked(runCommand)
const mockedEsbuildBuild = vi.mocked(esbuild.build)

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

// `needsDomGlobals` matches on an exact `ui-kit` path segment, not a
// substring of the temp directory name mkdtempSync would otherwise produce.
function createTempPackageUnderCategory(category: string) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-package-test-'))
  const directory = path.join(base, category, 'core')

  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: '@codeminity/test-core' })
  )

  return directory
}

describe(readVersionFromPackageJson, () => {
  let tempDir: string | undefined

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  function writeTempPackageJson(content: unknown): string {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'read-version-test-'))

    const file = path.join(tempDir, 'package.json')

    fs.writeFileSync(file, JSON.stringify(content))

    return file
  }

  it('returns the version field', () => {
    const file = writeTempPackageJson({ name: 'some-package', version: '1.2.3' })

    expect(readVersionFromPackageJson(file)).toBe('1.2.3')
  })

  it('throws when the file has no version field', () => {
    const file = writeTempPackageJson({ name: 'some-package' })

    expect(() => readVersionFromPackageJson(file)).toThrow('Could not read version from')
  })

  it('throws when the file is not a JSON object', () => {
    const file = writeTempPackageJson('not-an-object')

    expect(() => readVersionFromPackageJson(file)).toThrow('Could not read version from')
  })

  it('throws when the file is null', () => {
    const file = writeTempPackageJson(null)

    expect(() => readVersionFromPackageJson(file)).toThrow('Could not read version from')
  })
})

describe(verifyTreeShakenSideEffect, () => {
  let tempDir: string | undefined

  beforeEach(async () => {
    // Restores the real esbuild for this block specifically — a mocked
    // bundler can't prove real tree-shaking behavior, which is the entire
    // point of these tests.
    const actualEsbuild = await vi.importActual<typeof esbuild>('esbuild')

    mockedEsbuildBuild.mockImplementation(actualEsbuild.build)
  })

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  // Real esbuild, real tree-shaking — a mocked bundler couldn't have caught
  // the actual bug this check exists to catch a regression of (a bundler
  // silently deleting a package's registration side effect based on a
  // wrong "sideEffects" field).
  function createFixturePackage(sideEffects: boolean): string {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-shake-test-'))

    const packageDir = path.join(tempDir, 'node_modules', 'fixture-pkg')

    fs.mkdirSync(packageDir, { recursive: true })
    fs.writeFileSync(
      path.join(packageDir, 'package.json'),
      JSON.stringify({ name: 'fixture-pkg', main: 'index.js', type: 'module', sideEffects })
    )
    fs.writeFileSync(
      path.join(packageDir, 'index.js'),
      "customElements.define('fixture-el', class extends HTMLElement {})\n"
    )

    return tempDir
  }

  // Real esbuild I/O is inherently slower than the rest of this suite, and
  // gets slower still under heavy concurrent load (e.g. full-check now
  // runs everything else alongside this) — confirmed directly: the default
  // 5000ms timeout flaked here under concurrent load even though nothing
  // was actually broken. A generous fixed timeout, not a removed one — a
  // real hang should still fail the test.
  it('passes when the side effect survives real bundling', async () => {
    const dir = createFixturePackage(true)

    await expect(verifyTreeShakenSideEffect(dir, 'fixture-pkg')).resolves.toBeUndefined()
  }, 15000)

  it('throws when sideEffects: false lets a bundler tree-shake the side effect away', async () => {
    const dir = createFixturePackage(false)

    await expect(verifyTreeShakenSideEffect(dir, 'fixture-pkg')).rejects.toThrow(
      "fixture-pkg: a production bundler tree-shook away this package's side effects"
    )
  }, 15000)
})

describe(verifyPackage, () => {
  beforeEach(() => {
    vi.resetAllMocks()

    // Benign default so the ui-kit-category test below (which never
    // actually installs anything real — runCommand is mocked) doesn't hit
    // a real, doomed-to-fail esbuild resolution. Real tree-shaking
    // behavior is covered by verifyTreeShakenSideEffect's own tests above.
    mockedEsbuildBuild.mockResolvedValue({
      outputFiles: [{ text: 'customElements.define(...)' }]
    } as unknown as esbuild.BuildResult)
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
    expect(packCall?.[2]).toStrictEqual(
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

  // Reads the generated index.mjs during the mocked `node` call itself —
  // by the time `verifyPackage` resolves, its `finally` block has already
  // deleted the temp directory it lived in.
  function mockPackAndCaptureGeneratedFile(): { generatedFile: () => string | undefined } {
    let generatedFileContents: string | undefined

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
        generatedFileContents = fs.readFileSync(args[0] ?? '', 'utf8')
      }

      return Promise.resolve()
    })

    return { generatedFile: () => generatedFileContents }
  }

  it('registers DOM globals for a ui-kit-category package, but not otherwise', async () => {
    const { generatedFile } = mockPackAndCaptureGeneratedFile()

    const packagePath = createTempPackageUnderCategory('ui-kit')

    await expect(verifyPackage({ packagePath })).resolves.toBeUndefined()

    const addCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('add')
    )

    expect(addCall?.[1]).toStrictEqual(
      expect.arrayContaining([expect.stringMatching(/^@happy-dom\/global-registrator@/)])
    )

    expect(generatedFile()).toContain("import '@happy-dom/global-registrator/register.js'")
  })

  it('does not register DOM globals for a non-ui-kit package', async () => {
    const { generatedFile } = mockPackAndCaptureGeneratedFile()

    const packagePath = createTempPackageUnderCategory('request')

    await expect(verifyPackage({ packagePath })).resolves.toBeUndefined()

    const addCall = mockedRunCommand.mock.calls.find(
      ([command, args]) => command === 'pnpm' && args?.includes('add')
    )

    expect(addCall?.[1]).not.toStrictEqual(
      expect.arrayContaining([expect.stringMatching(/^@happy-dom\/global-registrator@/)])
    )

    expect(generatedFile()).not.toContain('@happy-dom/global-registrator')
  })
})
