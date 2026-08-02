import { bench, describe } from 'vitest'

import { TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { handleAuthRequest } from '../src/auth/handle-auth-request'
import { createRequestInit } from '../src/mocks/create-request-init'

import type { Config } from '../src/shared/config.interface'

const TEST_INPUT = '/test'

describe('handleAuthRequest (fetch)', () => {
  bench('JWT mode, attaches Authorization header', async () => {
    const config = createAuthConfig({ getToken: () => Promise.resolve('token') }) as Config

    await handleAuthRequest(TEST_INPUT, createRequestInit(), config, createRefreshQueueMock())
  })

  bench('COOKIE mode, sets credentials: include', async () => {
    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config

    await handleAuthRequest(TEST_INPUT, createRequestInit(), config, createRefreshQueueMock())
  })

  bench('skipAuth: true, bypasses auth entirely', async () => {
    const config = createAuthConfig({ getToken: () => Promise.resolve('token') }) as Config

    await handleAuthRequest(
      TEST_INPUT,
      createRequestInit({ codeminity: { skipAuth: true } }),
      config,
      createRefreshQueueMock()
    )
  })
})
