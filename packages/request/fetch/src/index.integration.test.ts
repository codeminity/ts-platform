import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TokenModeEnum, createFetch } from './index.js'

describe('package entry point (real, unmocked)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createFetch() returns a working function without throwing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const apiFetch = createFetch()

    const res = await apiFetch('/ping')

    await expect(res.json()).resolves.toStrictEqual({ ok: true })
  })

  it('createFetch() can be called multiple times without shared state', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ from: 'a' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ from: 'b' }), { status: 200 }))

    const apiFetchA = createFetch({ getToken: () => 'a-token' })
    const apiFetchB = createFetch({ getToken: () => 'b-token' })

    const [resA, resB] = await Promise.all([apiFetchA('/x'), apiFetchB('/x')])

    await expect(resA.json()).resolves.toStrictEqual({ from: 'a' })
    await expect(resB.json()).resolves.toStrictEqual({ from: 'b' })
  })

  it('attaches Authorization header end-to-end via getToken', async () => {
    let seenAuthHeader: string | null = null

    vi.mocked(fetch).mockImplementation((_input, init) => {
      seenAuthHeader = (init?.headers as Headers).get('Authorization')

      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    })

    const apiFetch = createFetch({ getToken: () => 'real-token' })

    await apiFetch('/secure')

    expect(seenAuthHeader).toBe('Bearer real-token')
  })

  it('sets credentials: include end-to-end in COOKIE mode', async () => {
    let seenCredentials: RequestCredentials | undefined

    vi.mocked(fetch).mockImplementation((_input, init) => {
      seenCredentials = init?.credentials

      return Promise.resolve(new Response(null, { status: 200 }))
    })

    const apiFetch = createFetch({ tokenMode: TokenModeEnum.COOKIE })

    await apiFetch('/secure')

    expect(seenCredentials).toBe('include')
  })

  it('skips auth entirely when skipAuth is set for the request', async () => {
    let seenAuthHeader: string | null = 'not-checked'

    vi.mocked(fetch).mockImplementation((_input, init) => {
      seenAuthHeader = (init?.headers as Headers | undefined)?.get('Authorization') ?? null

      return Promise.resolve(new Response(null, { status: 200 }))
    })

    const apiFetch = createFetch({ getToken: () => 'real-token' })

    await apiFetch('/public', { codeminity: { skipAuth: true } })

    expect(seenAuthHeader).toBeNull()
  })

  it('emits mapped error events end-to-end on HTTP error responses', async () => {
    let seenEvent: string | undefined

    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }))

    const apiFetch = createFetch({
      onEvent: (event) => {
        seenEvent = event
      }
    })

    const res = await apiFetch('/missing')

    expect(res.status).toBe(404)
    expect(seenEvent).toBe('not_found')
  })

  it('resolves (does not throw) when the server keeps returning 401 and refresh keeps failing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }))

    const apiFetch = createFetch({
      isTokenExpired: () => true,
      getToken: () => 'stale-token',
      refreshToken: () => {
        throw new Error('refresh failed')
      }
    })

    const results = await Promise.allSettled([apiFetch('/a'), apiFetch('/b'), apiFetch('/c')])

    const statuses = results.map((result) =>
      result.status === 'fulfilled' ? result.value.status : (result.reason as unknown)
    )
    expect(statuses).toStrictEqual([401, 401, 401])
  })

  it('retries a genuine network failure and eventually succeeds', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const apiFetch = createFetch({ retries: 2, retryDelay: 0 })

    const res = await apiFetch('/flaky')

    await expect(res.json()).resolves.toStrictEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('refreshes token only once for concurrent requests with expired token', async () => {
    let refreshCount = 0
    let refreshed = false

    vi.mocked(fetch).mockImplementation((_input, init) => {
      const auth = (init?.headers as Headers).get('Authorization')

      if (auth !== 'Bearer new-token') {
        return Promise.resolve(new Response(null, { status: 401 }))
      }

      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    })

    const apiFetch = createFetch({
      isTokenExpired: () => !refreshed,
      getToken: () => 'new-token',
      refreshToken: async () => {
        refreshCount++
        await new Promise((r) => setTimeout(r, 20))
        refreshed = true
      }
    })

    const responses = await Promise.all([
      apiFetch('/a'),
      apiFetch('/b'),
      apiFetch('/c'),
      apiFetch('/d'),
      apiFetch('/e')
    ])

    expect(refreshCount).toBe(1)
    expect(responses).toHaveLength(5)

    for (const res of responses) {
      await expect(res.json()).resolves.toStrictEqual({ ok: true })
    }
  })

  it('does not refresh again after a successful refresh', async () => {
    let refreshCount = 0
    let refreshed = false

    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const apiFetch = createFetch({
      isTokenExpired: () => !refreshed,
      getToken: () => 'token',
      refreshToken: () => {
        refreshCount++
        refreshed = true
      }
    })

    await apiFetch('/first')
    await apiFetch('/second')
    await apiFetch('/third')

    expect(refreshCount).toBe(1)
  })

  it('continues serving requests after a previous refresh failure', async () => {
    let refreshCount = 0
    let refreshed = false
    let shouldFailRefresh = true

    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    )

    const apiFetch = createFetch({
      isTokenExpired: () => !refreshed,
      getToken: () => 'token',
      refreshToken: () => {
        refreshCount++

        if (shouldFailRefresh) {
          shouldFailRefresh = false
          throw new Error('refresh failed')
        }

        refreshed = true
      }
    })

    const first = await Promise.all([apiFetch('/a'), apiFetch('/b')])

    for (const res of first) {
      await expect(res.json()).resolves.toStrictEqual({ ok: true })
    }

    const second = await Promise.all([apiFetch('/c'), apiFetch('/d')])

    for (const res of second) {
      await expect(res.json()).resolves.toStrictEqual({ ok: true })
    }

    expect(refreshCount).toBe(2)
  })
})
