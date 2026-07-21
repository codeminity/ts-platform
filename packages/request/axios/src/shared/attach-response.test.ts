import { describe, expect, it, vi } from 'vitest'

import { createAxiosMock } from '../mocks/create-axios'

import { attachResponseInterceptor } from './attach-response'
import { handleResponseError } from './response-error'

import type { Config } from './config.interface'
import type { AxiosResponse } from 'axios'

vi.mock('./response-error.ts', () => ({
  handleResponseError: vi.fn()
}))

describe('attachResponseInterceptor', () => {
  it('registers response error interceptor', () => {
    const { instance, getErrorInterceptor } = createAxiosMock()

    attachResponseInterceptor(instance, {})

    expect(getErrorInterceptor()).toBeTypeOf('function')
  })

  it('forwards error to handleResponseError', async () => {
    const { instance, getErrorInterceptor } = createAxiosMock()

    const config = {} as Config
    const error = new Error('boom')

    const response = {
      status: 200,
      statusText: '',
      headers: {},
      config: {} as AxiosResponse['config'],
      data: 'ok'
    } satisfies AxiosResponse

    vi.mocked(handleResponseError).mockResolvedValue(response)

    attachResponseInterceptor(instance, config)

    const interceptor = getErrorInterceptor()

    const result = await interceptor(error)

    expect(handleResponseError).toHaveBeenCalledTimes(1)
    expect(handleResponseError).toHaveBeenCalledWith(instance, config, error)
    expect(result).toBe(response)
  })
})
