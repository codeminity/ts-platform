import { vi } from 'vitest'

import { type AuthConfig } from '@codeminity/request-core'

const noop = async () => {
  /* empty */
}

export const createAuthConfig = (overrides?: Partial<AuthConfig>): AuthConfig => ({
  tokenMode: 'JWT',

  getToken: vi.fn(() => 'token'),
  isTokenExpired: vi.fn(() => false),
  refreshToken: vi.fn(noop),

  onRefreshStart: vi.fn(noop),
  onRefreshSuccess: vi.fn(noop),
  onRefreshFail: vi.fn(noop),

  ...overrides
})
