import type { TokenModeEnum } from '../enums/token-mode'

/**
 * @public
 */
export type TokenMode = (typeof TokenModeEnum)[keyof typeof TokenModeEnum]
