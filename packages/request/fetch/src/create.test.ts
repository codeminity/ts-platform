import { beforeEach, describe, expect, it, vi } from 'vitest'

const performRequest = vi.fn()
const createRefreshQueue = vi.fn(() => ({ run: vi.fn() }))

vi.mock('@codeminity/request-core', () => ({
  createRefreshQueue
}))

vi.mock('./shared/perform-request.ts', () => ({
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

    const queue = { run: vi.fn() }
    createRefreshQueue.mockReturnValue(queue)

    const config = { getToken: vi.fn() }
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

    const queueA = { run: vi.fn() }
    const queueB = { run: vi.fn() }

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
