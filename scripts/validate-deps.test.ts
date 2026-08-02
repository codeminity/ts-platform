import { beforeEach, describe, expect, it, vi } from 'vitest'

const cruise = vi.fn()

vi.mock('dependency-cruiser', () => ({
  cruise
}))

describe('validateDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves when the cruise reports no violations', async () => {
    cruise.mockResolvedValue({ exitCode: 0, output: '' })

    const { validateDeps } = await import('./validate-deps')

    await expect(validateDeps()).resolves.toBeUndefined()
  })

  it('throws the string output when the cruise reports a violation', async () => {
    cruise.mockResolvedValue({ exitCode: 1, output: 'error core-no-adapter-deps: ...' })

    const { validateDeps } = await import('./validate-deps')

    await expect(validateDeps()).rejects.toThrow('error core-no-adapter-deps: ...')
  })

  it('stringifies non-string output when the cruise reports a violation', async () => {
    cruise.mockResolvedValue({ exitCode: 1, output: { summary: { error: 1 } } })

    const { validateDeps } = await import('./validate-deps')

    await expect(validateDeps()).rejects.toThrow('"error":1')
  })

  it('passes the expected rule set and options to cruise', async () => {
    cruise.mockResolvedValue({ exitCode: 0, output: '' })

    const { validateDeps } = await import('./validate-deps')

    await validateDeps()

    const call = cruise.mock.calls[0] as
      [string[], { validate?: boolean; ruleSet?: { forbidden?: { name?: string }[] } }] | undefined

    expect(call?.[0]).toEqual(['packages'])
    expect(call?.[1].validate).toBe(true)
    expect(call?.[1].ruleSet?.forbidden?.map((rule) => rule.name)).toEqual([
      'no-circular',
      'core-no-adapter-deps'
    ])
  })
})
