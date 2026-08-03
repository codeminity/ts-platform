import { describe, expect, it } from 'vitest'

import { createAuthConfig as createAuthConfigMock } from './auth/mocks/create-auth-config.js'
import { createRefreshQueue as createRefreshQueueMock } from './auth/mocks/create-refresh-queue.js'
import { createAuthConfig, createRefreshQueue } from './test-utils.js'

describe('test-utils entrypoint', () => {
  it('re-exports createAuthConfig', () => {
    expect(createAuthConfig).toBe(createAuthConfigMock)
  })

  it('re-exports createRefreshQueue', () => {
    expect(createRefreshQueue).toBe(createRefreshQueueMock)
  })
})
