import { describe, expect, it } from 'vitest'

import { TokenModeEnum } from './token-mode.enum'

describe('TokenModeEnum', () => {
  it('exposes the expected token modes', () => {
    expect(TokenModeEnum).toEqual({
      JWT: 'JWT',
      COOKIE: 'COOKIE'
    })
  })
})
