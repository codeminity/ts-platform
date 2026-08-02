import { bench, describe } from 'vitest'

import { createRefreshQueue } from '../src/auth/create-refresh-queue'
import { handleRefreshToken } from '../src/auth/refresh-token'

import type { AuthConfig } from '../src/auth/auth-config.interface'

const noop = (): Promise<void> => Promise.resolve()

const expiredConfig: AuthConfig = {
  tokenMode: 'JWT',
  isTokenExpired: () => Promise.resolve(true),
  refreshToken: noop,
  onRefreshStart: noop,
  onRefreshSuccess: noop
}

const notExpiredConfig: AuthConfig = {
  tokenMode: 'JWT',
  isTokenExpired: () => Promise.resolve(false),
  refreshToken: noop
}

const noRefreshConfig: AuthConfig = { tokenMode: 'JWT' }

describe('handleRefreshToken', () => {
  bench('token expired, runs a fresh refresh through the queue', async () => {
    await handleRefreshToken(expiredConfig, createRefreshQueue())
  })

  bench('token not expired, checks and returns without refreshing', async () => {
    await handleRefreshToken(notExpiredConfig, createRefreshQueue())
  })

  bench('no isTokenExpired/refreshToken configured, returns immediately', async () => {
    await handleRefreshToken(noRefreshConfig, createRefreshQueue())
  })
})
