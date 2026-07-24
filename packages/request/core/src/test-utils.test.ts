import { describe, expect, it } from 'vitest'

import { createAuthConfig as createAuthConfigMock } from './auth/mocks/create-auth-config'
import { createRefreshQueue as createRefreshQueueMock } from './auth/mocks/create-refresh-queue'
import { createAuthConfig, createRefreshQueue } from './test-utils'

describe('test-utils entrypoint', () => {
  it('re-exports createAuthConfig', () => {
    expect(createAuthConfig).toBe(createAuthConfigMock)
  })

  it('re-exports createRefreshQueue', () => {
    expect(createRefreshQueue).toBe(createRefreshQueueMock)
  })
})
