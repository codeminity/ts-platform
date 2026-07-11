import type { InternalAxiosRequestConfig } from 'axios'

export interface RequestConfig {
  skipAuth?: boolean

  retries?: number
  retryDelay?: number
}

export interface InternalRequestConfig extends InternalAxiosRequestConfig {
  codeminity?: RequestConfig
  attempt?: number
}
