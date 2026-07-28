import type { FetchRequestInit } from '../shared/request-config.interface'

export function createRequestInit(overrides: Partial<FetchRequestInit> = {}): FetchRequestInit {
  return {
    codeminity: {},
    ...overrides
  }
}
