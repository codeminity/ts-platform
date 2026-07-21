import { AxiosHeaders } from 'axios'

import type { InternalRequestConfig } from '../shared/request-config.interface'

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
