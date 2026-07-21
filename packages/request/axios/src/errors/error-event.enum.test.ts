import { describe, expect, it } from 'vitest'

import { ErrorEventEnum as CoreErrorEventEnum } from '@codeminity/request-core'

import { ErrorEventEnum } from './error-event.enum'

describe('ErrorEventEnum', () => {
  it('includes all core error events', () => {
    expect(ErrorEventEnum).toMatchObject(CoreErrorEventEnum)
  })

  it('includes axios-specific error events', () => {
    expect(ErrorEventEnum.BAD_REQUEST).toBe('bad_request')
    expect(ErrorEventEnum.UNAUTHORIZED).toBe('unauthorized')
    expect(ErrorEventEnum.FORBIDDEN).toBe('forbidden')
    expect(ErrorEventEnum.NOT_FOUND).toBe('not_found')
    expect(ErrorEventEnum.CONFLICT).toBe('conflict')
    expect(ErrorEventEnum.UNPROCESSABLE_ENTITY).toBe('unprocessable_entity')
    expect(ErrorEventEnum.TOO_MANY_REQUESTS).toBe('too_many_requests')
    expect(ErrorEventEnum.INTERNAL_ERROR).toBe('internal_error')
    expect(ErrorEventEnum.BAD_GATEWAY).toBe('bad_gateway')
    expect(ErrorEventEnum.SERVICE_UNAVAILABLE).toBe('service_unavailable')
    expect(ErrorEventEnum.GATEWAY_TIMEOUT).toBe('gateway_timeout')
  })

  it('does not overwrite core error events', () => {
    for (const [key, value] of Object.entries(CoreErrorEventEnum)) {
      expect(ErrorEventEnum[key as keyof typeof CoreErrorEventEnum]).toBe(value)
    }
  })
})
