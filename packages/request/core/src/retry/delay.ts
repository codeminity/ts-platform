/**
 * Resolves after the given number of milliseconds, or immediately once
 * `signal` aborts — so cancelling mid-backoff doesn't have to wait out the
 * rest of the delay. Used to space out retry attempts.
 *
 * @public
 */
export function delay(
  ms: number,
  signal?: {
    readonly aborted: boolean
    addEventListener?(type: 'abort', listener: () => void): void
    removeEventListener?(type: 'abort', listener: () => void): void
  }
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }

    const onAbort = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener?.('abort', onAbort)
      resolve()
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort)
      resolve()
    }, ms)

    signal?.addEventListener?.('abort', onAbort)
  })
}
