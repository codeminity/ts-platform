import { bench, describe } from 'vitest'

import { createRefreshQueue } from '../src/auth/create-refresh-queue'

const noop = (): Promise<void> => Promise.resolve()

describe('createRefreshQueue', () => {
  bench('single sequential run()', async () => {
    const queue = createRefreshQueue()

    await queue.run(noop)
  })

  bench('10 concurrent run() calls (coalesced into one task)', async () => {
    const queue = createRefreshQueue()

    await Promise.all(Array.from({ length: 10 }, () => queue.run(noop)))
  })

  bench('10 sequential refresh cycles on the same queue', async () => {
    const queue = createRefreshQueue()

    for (let i = 0; i < 10; i++) {
      await queue.run(noop)
    }
  })
})
