import type { RefreshQueue } from '../interfaces/refresh-queue'

/**
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
