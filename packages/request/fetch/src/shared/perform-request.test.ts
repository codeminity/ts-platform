import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRefreshQueue } from '@codeminity/request-core/test-utils'

import { performRequest } from './perform-request.js'

import type { Config } from './config.interface.js'

type OnEvent = NonNullable<Config['onEvent']>
type OnError = NonNullable<Config['onError']>

describe(performRequest, () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
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
    const onEvent = vi.fn<OnEvent>()
    const onError = vi.fn<OnError>()

    const notFound = new Response(null, { status: 404 })

    vi.mocked(fetch).mockResolvedValue(notFound)

    const config: Config = { onEvent, onError }

    await performRequest('/missing', {}, config, createRefreshQueue())

    const expectedOutcome = { input: '/missing', init: {}, response: notFound }

    expect(onEvent).toHaveBeenCalledWith('not_found', expectedOutcome)
    expect(onError).toHaveBeenCalledWith(expectedOutcome)
  })

  it('does not emit callbacks when retrying (only on the final outcome)', async () => {
    const onEvent = vi.fn<OnEvent>()

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const config: Config = { retries: 1, retryOnStatuses: [500], onEvent }

    await performRequest('/flaky', {}, config, createRefreshQueue())

    expect(onEvent).not.toHaveBeenCalled()
  })
})
