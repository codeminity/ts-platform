import type { RetryConfig } from './retry-config.interface.js'

/**
 * Randomizes a delay per the given jitter strategy: `'full'` picks anywhere
 * from 0 up to `delayMs`; `'equal'` keeps at least half of it, randomizing
 * the rest; `'none'` (or unset) returns `delayMs` unchanged.
 *
 * @public
 */
export function applyRetryJitter(delayMs: number, jitter?: RetryConfig['retryJitter']): number {
  switch (jitter) {
    case 'full':
      return Math.random() * delayMs
    case 'equal':
      return delayMs / 2 + Math.random() * (delayMs / 2)
    case 'none':
    case undefined:
      return delayMs
  }
}
