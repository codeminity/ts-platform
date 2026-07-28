import { describe, expect, it } from 'vitest'

import { dependencies } from './dependencies'
import { handleRefreshToken } from './refresh-token'

describe('dependencies', () => {
  it('exposes handleRefreshToken', () => {
    expect(dependencies.handleRefreshToken).toBe(handleRefreshToken)
  })
})
