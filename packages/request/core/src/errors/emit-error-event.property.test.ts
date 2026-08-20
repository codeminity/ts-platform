import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'

import { emitterCallback } from './emit-error-event.js'

type OnEvent = (event: string, outcome: { code: number }) => void
type OnError = (outcome: { code: number }) => void

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
            ? vi.fn<OnEvent>(() => {
                if (onEventThrows) throw new Error('onEvent failed')
              })
            : undefined

          const onError = hasOnError
            ? vi.fn<OnError>(() => {
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

          expect(onEvent?.mock.calls ?? []).toStrictEqual(
            hasOnEvent ? [['event', { code: 1 }]] : []
          )
          expect(onError?.mock.calls ?? []).toStrictEqual(hasOnError ? [[{ code: 1 }]] : [])
        }
      )
    )
  })
})
