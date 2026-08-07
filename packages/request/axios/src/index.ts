import { configuredAxios } from './create-configured-axios.js'
import { create } from './create.js'

import type { Config } from './shared/config.interface.js'
import type { RequestConfig } from './shared/request-config.interface.js'

declare module 'axios' {
  interface CreateAxiosDefaults {
    codeminity?: Config
  }

  interface AxiosRequestConfig {
    codeminity?: RequestConfig
  }
}

// @codeminity/request-core exports
export type { AuthConfig } from '@codeminity/request-core'
export { TokenModeEnum } from '@codeminity/request-core'

export type { CallbackConfig } from './shared/callback-config.interface.js'
export type { Config } from './shared/config.interface.js'
export type { ErrorEvent } from './errors/error-event.type.js'
export { ErrorEventEnum } from './errors/error-event.enum.js'
export type { RequestConfig } from './shared/request-config.interface.js'
export type { RetryConfig } from './retry/retry-config.interface.js'

export default configuredAxios

export * from 'axios'
export { create }
