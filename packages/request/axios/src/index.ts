import axios from 'axios'

import { create } from './create'
import { getAxiosInstance } from './shared/get-axios-instance'

import type { Config } from './shared/config.interface'
import type { RequestConfig } from './shared/request-config.interface'

declare module 'axios' {
  interface CreateAxiosDefaults {
    codeminity?: Config
  }

  interface AxiosRequestConfig {
    codeminity?: RequestConfig
  }
}

export type { AuthConfig } from '@codeminity/request-core'

export type { CallbackConfig } from './shared/callback-config.interface'
export type { Config } from './shared/config.interface'
export type { RequestConfig } from './shared/request-config.interface'
export type { RetryConfig } from './retry/retry-config.interface'

export default Object.assign(getAxiosInstance, axios, { create })

export * from 'axios'
export { create }
