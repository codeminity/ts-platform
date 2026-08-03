import { describe, expect, it } from 'vitest'

import { dependencies } from './dependencies.js'
import { handleRefreshToken } from './refresh-token.js'

describe('dependencies', () => {
  it('exposes handleRefreshToken', () => {
    expect(dependencies.handleRefreshToken).toBe(handleRefreshToken)
  })
})
