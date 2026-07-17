import axios from 'axios'

import { create } from './factories/create'
import { getAxiosInstance } from './utils/get-axios-instance'

import type { Config } from './interfaces/config'
import type { RequestConfig } from './interfaces/request-config'

declare module 'axios' {
  interface CreateAxiosDefaults {
    codeminity?: Config
  }

  interface AxiosRequestConfig {
    codeminity?: RequestConfig
  }
}

export type { AuthConfig } from '@codeminity/request-core'

export type { CallbackConfig } from './interfaces/callback-config'
export type { Config } from './interfaces/config'
export type { RequestConfig } from './interfaces/request-config'
export type { RetryConfig } from './interfaces/retry-config'

export default Object.assign(getAxiosInstance, axios, { create })

export * from 'axios'
export { create }
