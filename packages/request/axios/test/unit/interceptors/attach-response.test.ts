import { describe, expect, it, vi } from 'vitest'

import { handleResponseError } from '../../../src/handlers/response-error'
import { attachResponseInterceptor } from '../../../src/interceptors/attach-response'
import { createAxiosMock } from '../../mocks/create-axios'

import type { Config } from '../../../src/interfaces/config'

vi.mock('../../../src/handlers/response-error', () => ({
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

    const response = { data: 'ok' }

    vi.mocked(handleResponseError).mockResolvedValue(response as never)

    attachResponseInterceptor(instance, config)

    const interceptor = getErrorInterceptor()

    const result = await interceptor(error)

    expect(handleResponseError).toHaveBeenCalledTimes(1)
    expect(handleResponseError).toHaveBeenCalledWith(instance, config, error)
    expect(result).toBe(response)
  })
})
