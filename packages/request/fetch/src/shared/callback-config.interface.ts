import type { ErrorEvent } from '../errors/error-event.type.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

/**
 * Lifecycle callbacks for classified and unclassified errors.
 *
 * @public
 */
export interface CallbackConfig {
  /** Called with the classified event (see {@link ErrorEvent}) for every failed outcome. */
  onEvent?: (event: ErrorEvent, outcome: FetchOutcome) => void | Promise<void>
  /** Called for every failed outcome, alongside `onEvent`. */
  onError?: (outcome: FetchOutcome) => void | Promise<void>
}
