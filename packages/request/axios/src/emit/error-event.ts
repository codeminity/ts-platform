import type { CallbackConfig } from '../interfaces/callback-config'
import type { ErrorEvent } from '../types/error-event'
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
