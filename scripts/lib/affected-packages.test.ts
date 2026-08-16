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

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = undefined
  }
})

describe('getAffectedPackageDirs', () => {
  it('returns an empty array when turbo reports no affected packages other than the workspace root', async () => {
    const workspace = createWorkspace()
    createPackage(workspace, 'ui-kit')

    const exec = vi.fn().mockResolvedValue({ stdout: JSON.stringify({ packages: ['//'] }) })

    const dirs = await getAffectedPackageDirs('origin/main', workspace, exec)

    expect(dirs).toEqual([])
    expect(exec).toHaveBeenCalledWith(
      'pnpm exec turbo run build --filter="...[origin/main]" --dry=json'
    )
  })

  it('maps affected package names back to their workspace directories', async () => {
    const workspace = createWorkspace()
    const uiKit = createPackage(workspace, 'ui-kit')
    createPackage(workspace, 'axios')

    const exec = vi
      .fn()
      .mockResolvedValue({ stdout: JSON.stringify({ packages: ['//', uiKit.name, 'some-app'] }) })

    const dirs = await getAffectedPackageDirs('origin/main', workspace, exec)

    // Only the workspace package matched by name is returned — 'some-app'
    // (an app, not a packages/ workspace member) is silently ignored rather
    // than erroring, since turbo's affected list also includes non-package
    // workspace members (apps) that have nothing to do with mutation scope.
    expect(dirs).toEqual([uiKit.dir.split(path.sep).join('/')])
  })

  it('uses forward slashes in returned paths regardless of platform', async () => {
    const workspace = createWorkspace()
    const nested = createPackage(workspace, 'request', 'axios')

    const exec = vi
      .fn()
      .mockResolvedValue({ stdout: JSON.stringify({ packages: ['//', nested.name] }) })

    const dirs = await getAffectedPackageDirs('origin/main', workspace, exec)

    expect(dirs).toEqual([nested.dir.split(path.sep).join('/')])
    expect(dirs[0]).not.toContain('\\')
  })

  it('uses the given baseRef in the turbo filter', async () => {
    const workspace = createWorkspace()
    const exec = vi.fn().mockResolvedValue({ stdout: JSON.stringify({ packages: ['//'] }) })

    await getAffectedPackageDirs('origin/release-branch', workspace, exec)

    expect(exec).toHaveBeenCalledWith(
      'pnpm exec turbo run build --filter="...[origin/release-branch]" --dry=json'
    )
  })
})
