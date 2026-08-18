import type { FetchRequestInit } from '../request-config.interface.js'

export function createRequestInit(overrides: Partial<FetchRequestInit> = {}): FetchRequestInit {
  return {
    codeminity: {},
    ...overrides
  }
}
