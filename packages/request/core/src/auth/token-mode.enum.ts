/**
 * Supported authentication strategies: header-based tokens (`JWT`) or
 * browser-managed session cookies (`COOKIE`).
 *
 * @public
 */
export const TokenModeEnum = {
  JWT: 'JWT',
  COOKIE: 'COOKIE'
} as const
