import { isAxiosError, type AxiosInstance, type AxiosResponse } from 'axios'

import { emitterCallback } from '../errors/emit-error-event'
import { mapErrorToEvent } from '../errors/error-to-event'
import { handleRetry } from '../retry/retry'

import type { Config } from './config.interface'
import type { InternalRequestConfig } from './request-config.interface'

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

  const retryConfig = { ...config, ...requestConfig.codeminity }
  const canRetry = await handleRetry(error, attempt, retryConfig)

  if (canRetry) {
    return instance.request(nextConfig)
  }

  await emitterCallback(event, error, config)
  throw error
}
