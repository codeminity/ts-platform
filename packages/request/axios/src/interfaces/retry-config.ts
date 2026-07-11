import type { RetryConfig as CoreRetryConfig } from '@codeminity/request-core'

import type { AxiosError } from 'axios'

export interface RetryConfig extends CoreRetryConfig {
  getRetryDelay?: (attempt: number, error: AxiosError) => number
  retryOnStatuses?: number[]
  shouldRetry?: (error: AxiosError, attempt: number) => boolean
}
