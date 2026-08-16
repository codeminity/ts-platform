import { describe, expect, it, vi } from 'vitest'

vi.mock('./affected-scope', () => ({ getAffectedScope: vi.fn() }))

const { getAffectedScope } = await import('./affected-scope')
const { getAffectedPackageDirs } = await import('./affected-packages')

const mockedGetAffectedScope = vi.mocked(getAffectedScope)

describe('getAffectedPackageDirs', () => {
  it("returns 'full' when getAffectedScope falls back to full", async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })

    const result = await getAffectedPackageDirs()

    expect(result).toBe('full')
  })

  it('returns only packageDirs, discarding appDirs — mutation testing is packages/-only (ADR-007)', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: ['apps/ui-kit-docs']
    })

    const result = await getAffectedPackageDirs()

    expect(result).toEqual(['packages/ui-kit'])
  })

  it('returns an empty array when nothing is affected', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'scoped', packageDirs: [], appDirs: [] })

    const result = await getAffectedPackageDirs()

    expect(result).toEqual([])
  })

  it('forwards baseRef, packagesDir, and exec through to getAffectedScope', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'scoped', packageDirs: [], appDirs: [] })
    const exec = vi.fn()

    await getAffectedPackageDirs('origin/release', 'custom-packages', exec)

    expect(mockedGetAffectedScope).toHaveBeenCalledWith('origin/release', exec, 'custom-packages')
  })
})
