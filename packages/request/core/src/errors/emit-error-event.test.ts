import { describe, expect, it, vi } from 'vitest'

import { emitterCallback } from './emit-error-event.js'

import type { EventCallbacks } from './emit-error-event.js'

interface Outcome {
  code: number
}
type OnEvent = NonNullable<EventCallbacks<string, Outcome>['onEvent']>
type OnError = NonNullable<EventCallbacks<string, Outcome>['onError']>

describe(emitterCallback, () => {
  it('calls onEvent even though onError throws', async () => {
    const onEvent = vi.fn<OnEvent>()
    const onError = vi.fn<OnError>().mockRejectedValue(new Error('error callback failed'))

    await expect(
      emitterCallback('abort', { code: 1 }, { onEvent, onError })
    ).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith('abort', { code: 1 })
    expect(onError).toHaveBeenCalledWith({ code: 1 })
  })
})
