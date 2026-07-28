import type { ErrorEvent } from './error-event.type'
import type { FetchOutcome } from './fetch-outcome.interface'
import type { CallbackConfig } from '../shared/callback-config.interface'

export async function emitterCallback(
  event: ErrorEvent,
  outcome: FetchOutcome,
  config: CallbackConfig
): Promise<void> {
  try {
    await config.onEvent?.(event, outcome)
  } catch {
    /* empty */
  }

  try {
    await config.onError?.(outcome)
  } catch {
    /* empty */
  }
}
