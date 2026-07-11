import { isAxiosError, type AxiosInstance, type AxiosResponse } from 'axios'

import { emitterCallback } from '../emit/error-event'
import { mapErrorToEvent } from '../mapper/error-to-event'

import { handleRetry } from './retry'

import type { Config } from '../interfaces/config'
import type { InternalRequestConfig } from '../interfaces/request-config'

export async function handleResponseError(
  instance: AxiosInstance,
  config: Config,
  error: unknown
): Promise<AxiosResponse> {
  if (!isAxiosError(error)) {
    throw error
  }

  const requestConfig = error.config as InternalRequestConfig | undefined
  const event = mapErrorToEvent(error)

  if (!requestConfig) {
    await emitterCallback(event, error, config)
    throw error
  }

  const attempt = (requestConfig.attempt ?? 0) + 1

  const nextConfig: InternalRequestConfig = {
    ...requestConfig,
    attempt
  }

  const retryConfig = requestConfig.codeminity ?? config
  const canRetry = await handleRetry(error, attempt, retryConfig)

  if (canRetry) {
    return instance.request(nextConfig)
  }

  await emitterCallback(event, error, config)
  throw error
}
