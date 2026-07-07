import { describe, it, expect, vi } from 'vitest'

import { createRefreshQueue } from '../../../src'

describe('createRefreshQueue', () => {
  it('runs the task', async () => {
    const queue = createRefreshQueue()
    const task = vi.fn()

    await queue.run(task)

    expect(task).toHaveBeenCalledTimes(1)
  })

  it('returns the same promise while a task is running', async () => {
    const queue = createRefreshQueue()

    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 10)
        })
    )

    const first = queue.run(task)
    const second = queue.run(task)

    expect(first).toBe(second)

    await first

    expect(task).toHaveBeenCalledTimes(1)
  })

  it('creates a new promise after the previous task is finished', async () => {
    const queue = createRefreshQueue()

    const task = vi.fn()

    const first = queue.run(task)

    await first

    const second = queue.run(task)

    await second

    expect(first).not.toBe(second)
    expect(task).toHaveBeenCalledTimes(2)
  })

  it('clears the queue when the task rejects', async () => {
    const queue = createRefreshQueue()

    const error = new Error('failed')

    await expect(queue.run(async () => Promise.reject(error))).rejects.toThrow(error)

    const task = vi.fn()

    await queue.run(task)

    expect(task).toHaveBeenCalledTimes(1)
  })

  it('handles high concurrency correctly', async () => {
    const queue = createRefreshQueue()

    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 10)
        })
    )

    const results = await Promise.all([
      queue.run(task),
      queue.run(task),
      queue.run(task),
      queue.run(task)
    ])

    expect(results[0]).toBe(results[1])
    expect(results[1]).toBe(results[2])
    expect(results[2]).toBe(results[3])
    expect(task).toHaveBeenCalledTimes(1)
  })
})
