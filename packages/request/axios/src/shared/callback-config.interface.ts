import type { ErrorEvent } from '../errors/error-event.type'
import type { AxiosError } from 'axios'

/**
 * Lifecycle callbacks for classified and unclassified errors.
 *
 * @public
 */
export interface CallbackConfig {
  /** Called for errors classified into a known lifecycle event (see {@link ErrorEvent}). */
  onEvent?: (event: ErrorEvent, error: AxiosError) => void | Promise<void>
  /** Called for errors that don't map to a classified event. */
  onError?: (error: unknown) => void | Promise<void>
}
