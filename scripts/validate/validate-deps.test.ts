import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { cruise as Cruise, ICruiseResult } from 'dependency-cruiser'

const cruise = vi.fn<typeof Cruise>()

vi.mock(import('dependency-cruiser'), () => ({
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
    // validateDeps only JSON.stringifies non-string output — the real
    // ICruiseResult's other required summary fields are irrelevant here.
    cruise.mockResolvedValue({
      exitCode: 1,
      output: { summary: { error: 1 } } as unknown as ICruiseResult
    })

    const { validateDeps } = await import('./validate-deps')

    await expect(validateDeps()).rejects.toThrow('"error":1')
  })

  it('passes the expected rule set and options to cruise', async () => {
    cruise.mockResolvedValue({ exitCode: 0, output: '' })

    const { validateDeps } = await import('./validate-deps')

    await validateDeps()

    const call = cruise.mock.calls[0] as
      [string[], { validate?: boolean; ruleSet?: { forbidden?: { name?: string }[] } }] | undefined

    expect(call?.[0]).toStrictEqual(['packages'])
    expect(call?.[1].validate).toBe(true)
    expect(call?.[1].ruleSet?.forbidden?.map((rule) => rule.name)).toStrictEqual([
      'no-circular',
      'core-no-adapter-deps'
    ])
  })
})
