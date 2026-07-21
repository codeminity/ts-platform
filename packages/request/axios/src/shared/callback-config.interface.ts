import type { ErrorEvent } from '../errors/error-event.type'
import type { AxiosError } from 'axios'

/**
 * @public
 */
export interface CallbackConfig {
  onEvent?: (event: ErrorEvent, error: AxiosError) => void | Promise<void>
  onError?: (error: unknown) => void | Promise<void>
}
