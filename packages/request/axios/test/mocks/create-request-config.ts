import { AxiosHeaders } from 'axios'

import type { InternalRequestConfig } from '../../src/interfaces/request-config'

export function createRequestConfig(
  overrides: Partial<InternalRequestConfig> = {}
): InternalRequestConfig {
  return {
    headers: new AxiosHeaders(),
    method: 'get',
    url: '/',
    codeminity: {},
    ...overrides
  }
}
