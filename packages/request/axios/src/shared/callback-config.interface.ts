import type { ErrorEvent } from '../errors/error-event.type.js'
import type { AxiosError } from 'axios'

/**
 * Lifecycle callbacks for classified and unclassified errors.
 *
 * @public
 */
export interface CallbackConfig {
  /**
   * Called with the classified event (see {@link ErrorEvent}) whenever the
   * failure is a real `AxiosError` — true for every HTTP-originated failure.
   * Not called for a non-Axios exception thrown by your own `getToken`/`refreshToken`,
   * since there's no HTTP response to classify.
   */
  onEvent?: (event: ErrorEvent, error: AxiosError) => void | Promise<void>
  /** Called for every failed outcome, alongside `onEvent`. */
  onError?: (error: unknown) => void | Promise<void>
}
