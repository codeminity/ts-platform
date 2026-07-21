import type { ErrorEvent } from './error-event.type'
import type { CallbackConfig } from '../shared/callback-config.interface'
import type { AxiosError } from 'axios'

export async function emitterCallback(
  event: ErrorEvent,
  error: AxiosError,
  config: CallbackConfig
): Promise<void> {
  try {
    await config.onEvent?.(event, error)
  } catch {
    /* empty */
  }

  try {
    await config.onError?.(error)
  } catch {
    /* empty */
  }
}
