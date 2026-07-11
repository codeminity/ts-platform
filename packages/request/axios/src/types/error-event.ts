import type { ErrorEventEnum } from '../enum/error-event'

export type ErrorEvent = (typeof ErrorEventEnum)[keyof typeof ErrorEventEnum]
