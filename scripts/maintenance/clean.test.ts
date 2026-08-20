import fs from 'node:fs'

import { globby } from 'globby'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { globby as Globby } from 'globby'

vi.mock(import('node:fs'), () => ({
  // Only `fs.rmSync` is ever called by the code under test — the rest of
  // the real `node:fs` shape is deliberately not part of this mock.
  default: { rmSync: vi.fn<typeof fs.rmSync>() } as unknown as typeof fs
}))

vi.mock(import('globby'), () => ({
  // `globby` is overloaded (an `objectMode`/`stats` options shape resolves
  // to `GlobEntry[]` instead) — only the plain string-array overload is
  // ever used here, so the mock is typed to just that one signature and
  // cast back to the full real type.
  globby: vi.fn<
    (pattern: string | readonly string[], options: unknown) => Promise<string[]>
  >() as unknown as typeof Globby
}))

const { CLEAN_GLOBS, clean } = await import('./clean')

const mockedGlobby = vi.mocked(globby)
const mockedRmSync = vi.mocked(fs.rmSync)

describe('clean', () => {
  beforeEach(() => {
    mockedGlobby.mockReset()
    mockedRmSync.mockClear()
  })

  it('globs the allowlist without expanding directories or following .gitignore', async () => {
    mockedGlobby.mockResolvedValue([])

    await clean()

    expect(mockedGlobby).toHaveBeenCalledWith(CLEAN_GLOBS, {
      onlyFiles: false,
      gitignore: false,
      dot: true,
      expandDirectories: false
    })
  })

  it('removes every matched path', async () => {
    mockedGlobby.mockResolvedValue(['node_modules', 'packages/request/core/dist', 'coverage'])

    await clean()

    expect(mockedRmSync).toHaveBeenCalledTimes(3)
    expect(mockedRmSync).toHaveBeenCalledWith('node_modules', { recursive: true, force: true })
    expect(mockedRmSync).toHaveBeenCalledWith('packages/request/core/dist', {
      recursive: true,
      force: true
    })
    expect(mockedRmSync).toHaveBeenCalledWith('coverage', { recursive: true, force: true })
  })

  it('does nothing when nothing matches', async () => {
    mockedGlobby.mockResolvedValue([])

    await clean()

    expect(mockedRmSync).not.toHaveBeenCalled()
  })
})
