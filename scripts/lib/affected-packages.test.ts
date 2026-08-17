import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAffectedPackageDirs } from './affected-packages'

let tempDir: string | undefined

function createWorkspace(): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'affected-packages-test-'))
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
  return vi.fn((command: string) => {
    if (command.startsWith('git diff')) return Promise.resolve({ stdout: responses.diff ?? '' })
    if (command.startsWith('git ls-files')) {
      return Promise.resolve({ stdout: responses.untracked ?? '' })
    }
    return Promise.resolve({ stdout: JSON.stringify(responses.turbo ?? { packages: [] }) })
  })
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = undefined
  }
})

describe('getAffectedPackageDirs', () => {
  it.each([
    'vitest.config.ts',
    'vitest.mutation.config.ts',
    'vitest.setup.ts',
    'stryker.config.ts',
    'tsconfig.base.json'
  ])("returns 'full' when %s changes — mutation testing's own runtime config", async (file) => {
    const exec = mockExec({ diff: `${file}\n` })

    const result = await getAffectedPackageDirs('origin/main', 'packages', exec)

    expect(result).toBe('full')
    // The whole point: a change to one of these skips the turbo lookup
    // entirely, same reasoning as getAffectedScope's own 'full' path.
    expect(exec).not.toHaveBeenCalledWith(expect.stringContaining('turbo run build'))
  })

  it("does NOT fall back to 'full' for a root/scripts file with no bearing on mutation testing's runtime", async () => {
    const exec = mockExec({
      diff: 'scripts/validate-deps.ts\nREADME.md\npackages/ui-kit/src/foo.ts\n',
      turbo: { packages: ['//', '@codeminity/ui-kit'] }
    })

    const workspace = createWorkspace()
    const uiKit = createPackage(workspace, 'ui-kit')

    const result = await getAffectedPackageDirs('origin/main', workspace, exec)

    expect(result).toEqual([uiKit.dir.split(path.sep).join('/')])
  })

  it('returns an empty array when nothing changed at all', async () => {
    const exec = mockExec({})

    const result = await getAffectedPackageDirs('origin/main', 'packages', exec)

    expect(result).toEqual([])
  })

  it('returns an empty array when turbo reports no affected packages', async () => {
    const exec = mockExec({
      diff: 'packages/ui-kit/README.md\n',
      turbo: { packages: ['//'] }
    })

    const result = await getAffectedPackageDirs('origin/main', 'packages', exec)

    expect(result).toEqual([])
  })

  it('maps affected turbo package names back to real directories, discarding apps/ (packages/-only, ADR-007)', async () => {
    const workspace = createWorkspace()
    const uiKit = createPackage(workspace, 'ui-kit')

    const exec = mockExec({
      diff: 'packages/ui-kit/src/foo.ts\n',
      turbo: { packages: ['//', uiKit.name, 'ui-kit-docs'] }
    })

    const result = await getAffectedPackageDirs('origin/main', workspace, exec)

    expect(result).toEqual([uiKit.dir.split(path.sep).join('/')])
  })

  it('uses the given baseRef for both the git diff and the turbo filter', async () => {
    const exec = mockExec({ diff: 'packages/ui-kit/src/foo.ts\n' })

    await getAffectedPackageDirs('origin/release-branch', 'packages', exec)

    expect(exec).toHaveBeenCalledWith('git diff --name-only origin/release-branch')
    expect(exec).toHaveBeenCalledWith(
      'pnpm exec turbo run build --filter="...[origin/release-branch]" --dry=json'
    )
  })

  it('defaults baseRef to origin/main and packagesDir to packages', async () => {
    const exec = mockExec({})

    await getAffectedPackageDirs(undefined, undefined, exec)

    expect(exec).toHaveBeenCalledWith('git diff --name-only origin/main')
  })

  it("falls back to 'full' when git diff itself fails (e.g. shallow CI clone)", async () => {
    const exec = vi.fn().mockRejectedValue(new Error('fatal: bad revision origin/main'))

    const result = await getAffectedPackageDirs('origin/main', 'packages', exec)

    expect(result).toBe('full')
  })

  it("falls back to 'full' and stringifies a non-Error rejection", async () => {
    const exec = vi.fn().mockRejectedValue('a plain string rejection')

    const result = await getAffectedPackageDirs('origin/main', 'packages', exec)

    expect(result).toBe('full')
  })

  it("falls back to 'full' when the turbo dry-run output is not valid JSON", async () => {
    const exec = mockExec({ diff: 'packages/ui-kit/src/foo.ts\n' })
    exec.mockImplementation((command: string) => {
      if (command.startsWith('git diff')) {
        return Promise.resolve({ stdout: 'packages/ui-kit/src/foo.ts\n' })
      }
      if (command.startsWith('git ls-files')) return Promise.resolve({ stdout: '' })
      return Promise.resolve({ stdout: 'not json' })
    })

    const result = await getAffectedPackageDirs('origin/main', 'packages', exec)

    expect(result).toBe('full')
  })
})
