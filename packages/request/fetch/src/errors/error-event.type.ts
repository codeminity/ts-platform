import type { ErrorEventEnum } from './error-event.enum'

/**
 * The event identifier passed to `onEvent` — one of the values of {@link ErrorEventEnum}.
 *
 * @public
 */
export type ErrorEvent = (typeof ErrorEventEnum)[keyof typeof ErrorEventEnum]
