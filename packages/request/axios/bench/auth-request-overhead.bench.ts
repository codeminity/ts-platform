import { bench, describe } from 'vitest'

import { TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { handleAuthRequest } from '../src/auth/handle-auth-request'
import { createRequestConfig } from '../src/mocks/create-request-config'

describe('handleAuthRequest (axios)', () => {
  bench('JWT mode, attaches Authorization header', async () => {
    const config = createAuthConfig({ getToken: () => Promise.resolve('token') })

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())
  })

  bench('COOKIE mode, sets withCredentials', async () => {
    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())
  })

  bench('skipAuth: true, bypasses auth entirely', async () => {
    const config = createAuthConfig({ getToken: () => Promise.resolve('token') })

    await handleAuthRequest(
      createRequestConfig({ codeminity: { skipAuth: true } }),
      config,
      createRefreshQueueMock()
    )
  })
})
