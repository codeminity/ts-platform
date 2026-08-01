import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'

import { emitterCallback } from './emit-error-event'

describe('emitterCallback (property-based)', () => {
  it('never rejects, regardless of whether onEvent/onError are present, throw, or resolve', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        async (hasOnEvent, onEventThrows, hasOnError, onErrorThrows) => {
          const onEvent = hasOnEvent
            ? vi.fn(() => {
                if (onEventThrows) throw new Error('onEvent failed')
              })
            : undefined

          const onError = hasOnError
            ? vi.fn(() => {
                if (onErrorThrows) throw new Error('onError failed')
              })
            : undefined

          await expect(
            emitterCallback(
              'event',
              { code: 1 },
              {
                ...(onEvent ? { onEvent } : {}),
                ...(onError ? { onError } : {})
              }
            )
          ).resolves.toBeUndefined()

          if (hasOnEvent) expect(onEvent).toHaveBeenCalledWith('event', { code: 1 })
          if (hasOnError) expect(onError).toHaveBeenCalledWith({ code: 1 })
        }
      )
    )
  })
})
