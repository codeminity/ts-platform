import type { TokenModeEnum } from './token-mode.enum.js'

/**
 * The set of supported authentication strategies — see {@link TokenModeEnum}.
 *
 * @public
 */
export type TokenMode = (typeof TokenModeEnum)[keyof typeof TokenModeEnum]
