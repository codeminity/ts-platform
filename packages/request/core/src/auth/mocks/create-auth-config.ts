import { vi } from 'vitest'

import type { AuthConfig } from '../auth-config.interface'

const noop = async () => {
  /* empty */
}

type AuthConfigOverrides = {
  [K in keyof AuthConfig]?: AuthConfig[K] | undefined
}

export const createAuthConfig = (overrides: AuthConfigOverrides = {}): AuthConfig => {
  const merged: Record<string, unknown> = {
    tokenMode: 'JWT',

    getToken: vi.fn(() => 'token'),
    isTokenExpired: vi.fn(() => false),
    refreshToken: vi.fn(noop),

    onRefreshStart: vi.fn(noop),
    onRefreshSuccess: vi.fn(noop),
    onRefreshFail: vi.fn(noop),

    ...overrides
  }

  // An explicit `key: undefined` override should behave like the key was
  // never set, both for AuthConfig's exactOptionalPropertyTypes contract
  // and for the mock's intended use (simulating a "missing dependency").
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) {
      Reflect.deleteProperty(merged, key)
    }
  }

  return merged
}
