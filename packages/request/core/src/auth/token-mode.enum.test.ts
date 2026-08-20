import { describe, expect, it } from 'vitest'

import { TokenModeEnum } from './token-mode.enum.js'

describe('tokenModeEnum', () => {
  it('exposes the expected token modes', () => {
    expect(TokenModeEnum).toStrictEqual({
      JWT: 'JWT',
      COOKIE: 'COOKIE'
    })
  })
})
