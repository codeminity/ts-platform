import type { Config } from '../interfaces/config'
import type { RequestConfig } from '../interfaces/request-config'

declare module 'axios' {
  interface CreateAxiosDefaults {
    codeminity?: Config
  }

  interface AxiosRequestConfig {
    codeminity?: RequestConfig
  }
}
