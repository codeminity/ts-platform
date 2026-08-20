import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AuthConfig,
  createRefreshQueue as CreateRefreshQueue,
  RefreshQueue
} from '@codeminity/request-core'

import type { performRequest as PerformRequest } from './shared/perform-request.js'

type GetToken = NonNullable<AuthConfig['getToken']>
type Run = RefreshQueue['run']

const performRequest = vi.fn<typeof PerformRequest>()
const createRefreshQueue = vi.fn<typeof CreateRefreshQueue>(() => ({ run: vi.fn<Run>() }))

vi.mock(import('@codeminity/request-core'), () => ({
  createRefreshQueue
}))

vi.mock(import('./shared/perform-request.js'), () => ({
  performRequest
}))

describe('createFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a callable function', async () => {
    const { createFetch } = await import('./create.js')

    const apiFetch = createFetch()

    expect(apiFetch).toBeTypeOf('function')
  })

  it('delegates each call to performRequest with the instance config and refresh queue', async () => {
    const { createFetch } = await import('./create.js')

    const queue = { run: vi.fn<Run>() }
    createRefreshQueue.mockReturnValue(queue)

    const config = { getToken: vi.fn<GetToken>() }
    const apiFetch = createFetch(config)

    const init = { method: 'GET' }
    await apiFetch('/users', init)

    expect(performRequest).toHaveBeenCalledWith('/users', init, config, queue)
  })

  it('defaults init to an empty object when omitted', async () => {
    const { createFetch } = await import('./create.js')

    const apiFetch = createFetch({})

    await apiFetch('/users')

    expect(performRequest).toHaveBeenCalledWith('/users', {}, {}, expect.any(Object))
  })

  it('uses an empty config when not provided', async () => {
    const { createFetch } = await import('./create.js')

    const apiFetch = createFetch()

    await apiFetch('/users')

    expect(performRequest).toHaveBeenCalledWith('/users', {}, {}, expect.any(Object))
  })

  it('gives each instance its own refresh queue (per-instance isolation)', async () => {
    const { createFetch } = await import('./create.js')

    const queueA = { run: vi.fn<Run>() }
    const queueB = { run: vi.fn<Run>() }

    createRefreshQueue.mockReturnValueOnce(queueA)
    createRefreshQueue.mockReturnValueOnce(queueB)

    const apiFetchA = createFetch()
    const apiFetchB = createFetch()

    await apiFetchA('/a')
    await apiFetchB('/b')

    expect(createRefreshQueue).toHaveBeenCalledTimes(2)
    expect(performRequest).toHaveBeenNthCalledWith(1, '/a', {}, {}, queueA)
    expect(performRequest).toHaveBeenNthCalledWith(2, '/b', {}, {}, queueB)
  })
})
