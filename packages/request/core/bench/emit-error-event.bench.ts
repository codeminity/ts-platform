import { bench, describe } from 'vitest'

import { emitterCallback } from '../src/errors/emit-error-event'

const noop = (): void => {
  /* no-op, for benchmarking bare callback-invocation overhead */
}

describe('emitterCallback', () => {
  bench('both onEvent and onError provided', async () => {
    await emitterCallback('event', { code: 1 }, { onEvent: noop, onError: noop })
  })

  bench('neither callback provided', async () => {
    await emitterCallback('event', { code: 1 }, {})
  })

  bench('onEvent throws, swallowed', async () => {
    await emitterCallback(
      'event',
      { code: 1 },
      {
        onEvent: () => {
          throw new Error('callback failure')
        }
      }
    )
  })
})
