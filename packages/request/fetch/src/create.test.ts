import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  createRefreshQueue as CreateRefreshQueue,
  RefreshQueue
} from '@codeminity/request-core'

import type { performRequest as PerformRequest } from './shared/perform-request.js'

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
