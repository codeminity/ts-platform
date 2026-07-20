import { describe, it, expect, vi } from 'vitest'

import { createRefreshQueue } from './create-refresh-queue'

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

  it('runs only one refresh task for concurrent calls', async () => {
    let calls = 0

    const queue = createRefreshQueue()

    const task = async () => {
      calls++

      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    await Promise.all([queue.run(task), queue.run(task), queue.run(task)])

    expect(calls).toBe(1)
  })

  it('allows retry after failed refresh', async () => {
    const queue = createRefreshQueue()

    let calls = 0

    const task = async () => {
      calls++

      await Promise.resolve()

      if (calls === 1) {
        throw new Error('failed')
      }
    }

    await expect(queue.run(task)).rejects.toThrow('failed')

    await expect(queue.run(task)).resolves.toBeUndefined()

    expect(calls).toBe(2)
  })

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
