import type { AuthConfig } from './auth-config.interface.js'
import type { RefreshQueue } from './refresh-queue.interface.js'

/**
 * Runs `task`, racing it against a timer — rejects with a timeout error if
 * `task` hasn't settled within `timeoutMs`. The timer is always cleared, so
 * a `task` that settles first never leaves a dangling timer behind.
 */
async function callWithTimeout(task: () => void | Promise<void>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`refreshToken did not settle within ${String(timeoutMs)}ms`))
    }, timeoutMs)
  })

  // `Promise.race` below attaches its own rejection handler, but only once
  // its executor runs — giving `timedOut` an immediate no-op `.catch` closes
  // the brief window where Node could otherwise flag it as unhandled before
  // `Promise.race` subscribes.
  // Stryker disable next-line CallExpression: equivalent mutant — this only
  // closes the brief window before `Promise.race` subscribes its own
  // rejection handler; no test can observe its absence without forcing a
  // real unhandled-rejection race condition.
  timedOut.catch(() => {
    /* handled via Promise.race below */
  })

  try {
    await Promise.race([task(), timedOut])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Runs the configured refresh flow if the current token is expired, coordinating
 * concurrent callers through the given refresh queue so only one refresh executes
 * at a time.
 *
 * @public
 */
export async function handleRefreshToken(
  config: AuthConfig,
  refreshQueue: RefreshQueue
): Promise<void> {
  const {
    isTokenExpired,
    refreshToken,
    refreshTimeout,
    onRefreshStart,
    onRefreshSuccess,
    onRefreshFail
  } = config

  if (!isTokenExpired || !refreshToken) return

  await refreshQueue.run(async () => {
    const expired = await isTokenExpired()

    if (!expired) return

    await onRefreshStart?.()

    const attempt = async (): Promise<void> => {
      try {
        if (refreshTimeout != null) {
          await callWithTimeout(refreshToken, refreshTimeout)
        } else {
          await refreshToken()
        }

        await onRefreshSuccess?.()
      } catch (error) {
        // Tracks whether `onRefreshFail` actually called `retry`, since its
        // own promise resolves either way (whether it retried or just
        // logged and returned) — that's the only way to tell "the original
        // failure still stands" apart from "a later attempt already handled
        // this" once we're back out of the callback. Held on an object
        // (not a bare `let`) so mutating it from inside the `retry` closure
        // is visible here — a primitive binding gets narrowed to its
        // initial literal value across the `await` below.
        // Stryker disable next-line ObjectLiteral: equivalent mutant —
        // `state.retried` is only ever read via plain truthy/falsy checks
        // below, so starting as `undefined` (an empty object) behaves
        // identically to starting as `false` until `retry` sets it `true`.
        const state = { retried: false }

        const retry = (): Promise<void> => {
          state.retried = true

          const nextAttempt = attempt()

          // If the caller never awaits (or returns) this promise, a later
          // rejection would otherwise surface as an unhandled rejection —
          // they've already opted out of observing the real outcome by not
          // awaiting it, but that misuse still shouldn't crash the process.
          // Stryker disable next-line CallExpression: equivalent mutant —
          // this attaches a handler to a throwaway derived promise, not to
          // `nextAttempt` itself; the real rejection returned to the caller
          // is unaffected either way, so only an unawaited-caller unhandled-
          // rejection would reveal its absence.
          nextAttempt.catch(() => {
            /* real rejection still propagates below to whoever does await it */
          })

          return nextAttempt
        }

        try {
          // Stryker disable next-line OptionalChaining: equivalent mutant —
          // without `?.`, a missing `onRefreshFail` throws a TypeError
          // caught by this same block; `state.retried` is still `false`
          // either way, so the `if (!state.retried) throw error` below
          // throws the identical original error regardless.
          await onRefreshFail?.(error, retry)
        } catch (retryOrCallbackError) {
          if (state.retried) {
            // The retried attempt eventually failed for good (its own
            // `attempt()` call ran out of retries) — that's the real,
            // final error, not the one that triggered this retry.
            throw retryOrCallbackError
          }
          // A throwing `onRefreshFail` that never called `retry` fails
          // safe, same as every other callback in this codebase — swallow
          // it and let the *original* `error` below surface instead.
        }

        if (!state.retried) {
          throw error
        }
      }
    }

    await attempt()
  })
}
