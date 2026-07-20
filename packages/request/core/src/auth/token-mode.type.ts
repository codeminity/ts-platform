import type { TokenModeEnum } from './token-mode.enum'

/**
 * @public
 */
export type TokenMode = (typeof TokenModeEnum)[keyof typeof TokenModeEnum]
