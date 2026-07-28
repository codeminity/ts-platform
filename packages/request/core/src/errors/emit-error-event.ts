/**
 * Lifecycle callbacks for a classified event and an unclassified outcome,
 * generic over an adapter's own event and outcome types.
 *
 * @public
 */
export interface EventCallbacks<TEvent, TOutcome> {
  /** Called with the classified event for a failed outcome. */
  onEvent?: (event: TEvent, outcome: TOutcome) => void | Promise<void>
  /** Called for every failed outcome, alongside `onEvent`. */
  onError?: (outcome: TOutcome) => void | Promise<void>
}

/**
 * Calls `onEvent` then `onError` on `callbacks`, swallowing any error either
 * callback throws so a failing callback never breaks the caller's own flow.
 *
 * @public
 */
export async function emitterCallback<TEvent, TOutcome>(
  event: TEvent,
  outcome: TOutcome,
  callbacks: EventCallbacks<TEvent, TOutcome>
): Promise<void> {
  try {
    await callbacks.onEvent?.(event, outcome)
  } catch {
    /* empty */
  }

  try {
    await callbacks.onError?.(outcome)
  } catch {
    /* empty */
  }
}
