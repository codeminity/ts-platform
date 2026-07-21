import { describe, expect, it } from 'vitest'

import { handleRefreshToken } from '@codeminity/request-core'

import { dependencies } from './dependencies'

describe('dependencies', () => {
  it('exposes handleRefreshToken from request-core', () => {
    expect(dependencies.handleRefreshToken).toBe(handleRefreshToken)
  })
})
