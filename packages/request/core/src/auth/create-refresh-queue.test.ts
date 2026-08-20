import { describe, it, expect } from 'vitest'

import { createRefreshQueue } from './create-refresh-queue.js'

describe(createRefreshQueue, () => {
  it('allows refresh again after previous refresh failure', async () => {
    let attempts = 0

    const queue = createRefreshQueue()

    await expect(
      queue.run(() => {
        attempts++

        return Promise.reject(new Error('fail'))
      })
    ).rejects.toThrow('fail')

    await queue.run(() => {
      attempts++

      return Promise.resolve()
    })

    expect(attempts).toBe(2)
  })
})
