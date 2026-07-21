import type { ErrorEventEnum } from './error-event.enum'

export type ErrorEvent = (typeof ErrorEventEnum)[keyof typeof ErrorEventEnum]
