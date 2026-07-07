import type { TokenModeEnum } from '../enums/token-mode'

export type TokenMode = (typeof TokenModeEnum)[keyof typeof TokenModeEnum]
