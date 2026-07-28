import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRefreshQueue } from '@codeminity/request-core/test-utils'

import { performRequest } from './perform-request'

import type { Config } from './config.interface'
import type { FetchRequestInit } from './request-config.interface'

describe('performRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the response on a successful (ok) call without retrying', async () => {
    const okResponse = new Response(null, { status: 200 })

    vi.mocked(fetch).mockResolvedValue(okResponse)

    const result = await performRequest('/x', {}, {}, createRefreshQueue())

    expect(result).toBe(okResponse)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns a non-ok response as-is when retries are not configured (mirrors native fetch)', async () => {
    const notFound = new Response(null, { status: 404 })

    vi.mocked(fetch).mockResolvedValue(notFound)

    const result = await performRequest('/missing', {}, {}, createRefreshQueue())

    expect(result).toBe(notFound)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries a non-ok response until it succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const config: Config = { retries: 1, retryOnStatuses: [500] }

    const result = await performRequest('/flaky', {}, config, createRefreshQueue())

    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns the final non-ok response once retries are exhausted', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }))

    const config: Config = { retries: 2, retryOnStatuses: [500] }

    const result = await performRequest('/always-500', {}, config, createRefreshQueue())

    expect(result.status).toBe(500)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('retries a thrown network error until it succeeds', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const config: Config = { retries: 1, retryDelay: 0 }

    const result = await performRequest('/network-flaky', {}, config, createRefreshQueue())

    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('rethrows the network error once retries are exhausted', async () => {
    const networkError = new TypeError('fetch failed')

    vi.mocked(fetch).mockRejectedValue(networkError)

    await expect(performRequest('/always-down', {}, {}, createRefreshQueue())).rejects.toBe(
      networkError
    )

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('emits the classified event and error on final failure', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const notFound = new Response(null, { status: 404 })

    vi.mocked(fetch).mockResolvedValue(notFound)

    const config: Config = { onEvent, onError }

    await performRequest('/missing', {}, config, createRefreshQueue())

    const expectedOutcome = { input: '/missing', init: {}, response: notFound }

    expect(onEvent).toHaveBeenCalledWith('not_found', expectedOutcome)
    expect(onError).toHaveBeenCalledWith(expectedOutcome)
  })

  it('does not emit callbacks when retrying (only on the final outcome)', async () => {
    const onEvent = vi.fn()

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const config: Config = { retries: 1, retryOnStatuses: [500], onEvent }

    await performRequest('/flaky', {}, config, createRefreshQueue())

    expect(onEvent).not.toHaveBeenCalled()
  })

  it('merges per-request codeminity overrides with the instance config for retry decisions', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const config: Config = { retryOnStatuses: [500] }
    const init: FetchRequestInit = { codeminity: { retries: 1 } }

    const result = await performRequest('/override', init, config, createRefreshQueue())

    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('applies auth (Authorization header) to every attempt', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

    const config: Config = { getToken: () => 'a-token' }

    await performRequest('/secure', {}, config, createRefreshQueue())

    const calls = vi.mocked(fetch).mock.calls

    expect(calls).toHaveLength(1)

    const [, usedInit] = calls[0] ?? []

    expect((usedInit?.headers as Headers).get('Authorization')).toBe('Bearer a-token')
  })
})
