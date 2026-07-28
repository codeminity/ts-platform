import type { FetchOutcome } from '../errors/fetch-outcome.interface'

export function createFetchOutcome(overrides: Partial<FetchOutcome> = {}): FetchOutcome {
  return {
    input: '/test',
    init: {},
    ...overrides
  }
}
