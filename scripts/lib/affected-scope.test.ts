import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAffectedScope } from './affected-scope'

import type { ExecFn } from './affected-scope'

let tempDir: string | undefined

function createWorkspace(): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'affected-scope-test-'))
  return tempDir
}

function createPackage(workspace: string, ...segments: string[]): { dir: string; name: string } {
  const dir = path.join(workspace, ...segments)
  fs.mkdirSync(dir, { recursive: true })
  const name = `@codeminity/${segments.at(-1) ?? 'pkg'}`
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name }))
  return { dir, name }
}

function mockExec(responses: {
  diff?: string
  untracked?: string
  turbo?: { packages: string[] }
}) {
  return vi.fn<ExecFn>((command: string) => {
    if (command.startsWith('git diff')) {
      return Promise.resolve({ stdout: responses.diff ?? '' })
    }
    if (command.startsWith('git ls-files')) {
      return Promise.resolve({ stdout: responses.untracked ?? '' })
    }
    return Promise.resolve({ stdout: JSON.stringify(responses.turbo ?? { packages: [] }) })
  })
}

describe(getAffectedScope, () => {
  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  it('falls back to full when a changed file sits outside packages/ and apps/', async () => {
    const exec = mockExec({ diff: 'turbo.json\npackages/ui-kit/src/foo.ts\n' })

    const scope = await getAffectedScope('origin/main', exec)

    expect(scope).toStrictEqual({ type: 'full' })
    // The whole point of falling back is to skip the (unreliable, for a
    // root-level change) turbo dependency-graph lookup entirely.
    expect(exec).not.toHaveBeenCalledWith(expect.stringContaining('turbo run build'))
  })

  it('falls back to full when a changed file is under scripts/', async () => {
    const exec = mockExec({ diff: 'scripts/full-check.ts\n' })

    const scope = await getAffectedScope('origin/main', exec)

    expect(scope).toStrictEqual({ type: 'full' })
  })

  it('falls back to full when an untracked (new) file sits outside packages/ and apps/', async () => {
    const exec = mockExec({ untracked: 'eslint.config.ts\n' })

    const scope = await getAffectedScope('origin/main', exec)

    expect(scope).toStrictEqual({ type: 'full' })
  })

  it('returns an empty scoped result when nothing changed at all', async () => {
    const exec = mockExec({})

    const scope = await getAffectedScope('origin/main', exec)

    expect(scope).toStrictEqual({ type: 'scoped', packageDirs: [], appDirs: [] })
  })

  it('returns an empty scoped result when turbo reports no affected packages', async () => {
    const exec = mockExec({
      diff: 'packages/ui-kit/README.md\n',
      turbo: { packages: ['//'] }
    })

    const scope = await getAffectedScope('origin/main', exec)

    expect(scope).toStrictEqual({ type: 'scoped', packageDirs: [], appDirs: [] })
  })

  it('maps affected turbo package names back to real directories under both packages/ and apps/', async () => {
    const workspace = createWorkspace()
    const packagesDir = path.join(workspace, 'packages')
    const appsDir = path.join(workspace, 'apps')

    const uiKit = createPackage(workspace, 'packages', 'ui-kit')
    createPackage(workspace, 'packages', 'axios')
    const uiKitDocs = createPackage(workspace, 'apps', 'ui-kit-docs')
    createPackage(workspace, 'apps', 'other-app')

    const exec = mockExec({
      diff: 'packages/ui-kit/src/foo.ts\n',
      turbo: { packages: ['//', uiKit.name, uiKitDocs.name] }
    })

    const scope = await getAffectedScope('origin/main', exec, packagesDir, appsDir)

    expect(scope).toStrictEqual({
      type: 'scoped',
      packageDirs: [uiKit.dir.split(path.sep).join('/')],
      appDirs: [uiKitDocs.dir.split(path.sep).join('/')]
    })
  })

  it('uses the given baseRef for both the git diff and the turbo filter', async () => {
    const exec = mockExec({ diff: 'packages/ui-kit/src/foo.ts\n' })

    await getAffectedScope('origin/release-branch', exec)

    expect(exec).toHaveBeenCalledWith('git diff --name-only origin/release-branch')
    expect(exec).toHaveBeenCalledWith(
      'pnpm exec turbo run build --filter="...[origin/release-branch]" --dry=json'
    )
  })

  it('defaults to origin/main when no baseRef is given', async () => {
    const exec = mockExec({})

    await getAffectedScope(undefined, exec)

    expect(exec).toHaveBeenCalledWith('git diff --name-only origin/main')
  })

  it("falls back to full when git diff itself fails (e.g. origin/main isn't a resolvable ref in a shallow CI clone)", async () => {
    const exec = vi.fn<ExecFn>().mockRejectedValue(new Error('fatal: bad revision origin/main'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* silence expected warning */
    })

    try {
      const scope = await getAffectedScope('origin/main', exec)

      expect(scope).toStrictEqual({ type: 'full' })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('bad revision origin/main'))
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('falls back to full and stringifies a non-Error rejection', async () => {
    const exec = vi.fn<ExecFn>().mockRejectedValue('a plain string rejection')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* silence expected warning */
    })

    try {
      const scope = await getAffectedScope('origin/main', exec)

      expect(scope).toStrictEqual({ type: 'full' })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('a plain string rejection'))
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('falls back to full when the turbo dry-run output is not valid JSON', async () => {
    const exec = vi.fn<ExecFn>((command: string) => {
      if (command.startsWith('git diff')) {
        return Promise.resolve({ stdout: 'packages/ui-kit/src/foo.ts\n' })
      }
      if (command.startsWith('git ls-files')) {
        return Promise.resolve({ stdout: '' })
      }
      return Promise.resolve({ stdout: 'not json' })
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* silence expected warning */
    })

    try {
      const scope = await getAffectedScope('origin/main', exec)

      expect(scope).toStrictEqual({ type: 'full' })
    } finally {
      warnSpy.mockRestore()
    }
  })
})
