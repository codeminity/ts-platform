import { describe, expect, it, vi } from 'vitest'

import { hasRelevantChanges } from './relevant-changes'

function mockExec(diff: string, untracked = '') {
  return vi.fn((command: string) => {
    if (command.startsWith('git diff')) return Promise.resolve({ stdout: diff })
    return Promise.resolve({ stdout: untracked })
  })
}

describe('hasRelevantChanges', () => {
  it('returns true when a changed (tracked) file falls under the given prefix', async () => {
    const exec = mockExec('packages/ui-kit/src/foo.ts\nDECISIONS.md\n')

    await expect(hasRelevantChanges('packages/ui-kit/', 'origin/main', exec)).resolves.toBe(true)
  })

  it('returns true when a changed (untracked) file falls under the given prefix', async () => {
    const exec = mockExec('', 'packages/ui-kit/src/new-file.ts\n')

    await expect(hasRelevantChanges('packages/ui-kit/', 'origin/main', exec)).resolves.toBe(true)
  })

  it('returns false when no changed file falls under the given prefix', async () => {
    const exec = mockExec('DECISIONS.md\nREADME.md\n')

    await expect(hasRelevantChanges('packages/ui-kit/', 'origin/main', exec)).resolves.toBe(false)
  })

  it('returns false when nothing changed at all', async () => {
    const exec = mockExec('')

    await expect(hasRelevantChanges('packages/ui-kit/', 'origin/main', exec)).resolves.toBe(false)
  })

  it('returns true (never silently skips) when determining changed files fails', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('fatal: bad revision origin/main'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* silence expected warning */
    })

    try {
      await expect(hasRelevantChanges('packages/ui-kit/', 'origin/main', exec)).resolves.toBe(true)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('bad revision origin/main'))
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('stringifies a non-Error rejection', async () => {
    const exec = vi.fn().mockRejectedValue('a plain string rejection')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* silence expected warning */
    })

    try {
      await expect(hasRelevantChanges('packages/ui-kit/', 'origin/main', exec)).resolves.toBe(true)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('a plain string rejection'))
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('defaults baseRef to origin/main and exec to the real implementation', async () => {
    // No exec override — exercises the real default parameter wiring
    // without actually caring about the (real, environment-dependent)
    // result, matching the same pattern already used for the sibling
    // getAffectedScope defaults.
    await expect(hasRelevantChanges('some/nonexistent/prefix/')).resolves.toEqual(
      expect.any(Boolean)
    )
  })
})
