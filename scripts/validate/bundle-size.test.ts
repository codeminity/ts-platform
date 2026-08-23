import fs from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { runCommand } from '../lib/run-command'

import { validateBundleSize } from './bundle-size'

vi.mock(import('../lib/run-command'), () => ({
  runCommand: vi.fn<typeof runCommand>()
}))

const mockedRunCommand = vi.mocked(runCommand)

const ENTRY_A = { name: 'a', path: 'packages/a/dist/index.js', limit: '1 kB' }
const ENTRY_B = { name: 'b', path: 'packages/b/dist/index.js', limit: '1 kB' }
const ENTRIES = [ENTRY_A, ENTRY_B]

function mockConfig(entries: typeof ENTRIES, existingPaths: string[]) {
  vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(entries))
  vi.spyOn(fs, 'existsSync').mockImplementation((path) => existingPaths.includes(String(path)))
}

describe(validateBundleSize, () => {
  it('skips (returns false) rather than failing when no entry has a built dist file', async () => {
    mockConfig(ENTRIES, [])

    await expect(validateBundleSize()).resolves.toBe(false)

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs size-limit unmodified and returns true when every entry exists', async () => {
    mockConfig(ENTRIES, [ENTRY_A.path, ENTRY_B.path])
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateBundleSize()).resolves.toBe(true)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['exec', 'size-limit'])
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('temporarily rewrites the config to just the existing entries, then restores it', async () => {
    const original = JSON.stringify(ENTRIES)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(original)
    vi.spyOn(fs, 'existsSync').mockImplementation((path) => path === ENTRY_A.path)
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateBundleSize()).resolves.toBe(true)

    expect(writeSpy).toHaveBeenNthCalledWith(
      1,
      '.size-limit.json',
      JSON.stringify([ENTRY_A], null, 2)
    )
    expect(writeSpy).toHaveBeenNthCalledWith(2, '.size-limit.json', original)
  })

  it('still restores the original config when size-limit itself fails', async () => {
    const original = JSON.stringify(ENTRIES)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(original)
    vi.spyOn(fs, 'existsSync').mockImplementation((path) => path === ENTRY_A.path)
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)
    mockedRunCommand.mockRejectedValue(new Error('over limit'))

    await expect(validateBundleSize()).rejects.toThrow('over limit')

    expect(writeSpy).toHaveBeenNthCalledWith(2, '.size-limit.json', original)
  })
})
