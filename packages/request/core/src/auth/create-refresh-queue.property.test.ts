import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { createRefreshQueue } from './create-refresh-queue'

describe('createRefreshQueue (property-based)', () => {
  it('runs the task exactly once no matter how many callers arrive concurrently', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 50 }), async (concurrentCalls) => {
        const queue = createRefreshQueue()
        let executions = 0

        const task = async () => {
          executions++
          await Promise.resolve()
        }

        await Promise.all(Array.from({ length: concurrentCalls }, () => queue.run(task)))

        expect(executions).toBe(1)
      })
    )
  })
})
