import type { RefreshQueue } from './refresh-queue.interface'

/**
 * Creates a queue that coordinates concurrent refresh attempts so only one
 * refresh runs at a time; callers that arrive while a refresh is in flight
 * share its result instead of starting a new one.
 *
 * @public
 */
export function createRefreshQueue(): RefreshQueue {
  let currentPromise: Promise<void> | null = null

  return {
    run(task): Promise<void> {
      currentPromise ??= Promise.resolve()
        .then(task)
        .finally(() => {
          currentPromise = null
        })

      return currentPromise
    }
  }
}
