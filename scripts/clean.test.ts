import fs from 'node:fs'

import { globby } from 'globby'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({
  default: {
    rmSync: vi.fn()
  }
}))

vi.mock('globby', () => ({
  globby: vi.fn()
}))

const { CLEAN_GLOBS, clean } = await import('./clean')

const mockedGlobby = vi.mocked(globby)
const mockedRmSync = vi.mocked(fs.rmSync)

beforeEach(() => {
  mockedGlobby.mockReset()
  mockedRmSync.mockClear()
})

describe('clean', () => {
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
