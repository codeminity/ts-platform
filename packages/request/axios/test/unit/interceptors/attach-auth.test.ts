import { describe, expect, it, vi } from 'vitest'

import type { RefreshQueue } from '@codeminity/request-core'

import { handleAuthRequest } from '../../../src/handlers/auth-request'
import { attachAuthInterceptor } from '../../../src/interceptors/attach-auth'
import { type Config } from '../../../src/interfaces/config'

import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

vi.mock('../../../src/handlers/auth-request', () => ({
  handleAuthRequest: vi.fn()
}))

type MockInterceptor = (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig>

function createAxiosInstanceMock() {
  let interceptor!: MockInterceptor

  const instance = {
    interceptors: {
      request: {
        use: (fn: MockInterceptor) => {
          interceptor = fn
        }
      }
    }
  } as unknown as AxiosInstance

  return { instance, getInterceptor: () => interceptor }
}

describe('attachAuthInterceptor', () => {
  it('should forward request through handleAuthRequest and return result', async () => {
    const mockedResult = {
      url: '/test'
    } as InternalAxiosRequestConfig

    const handleAuthMock = vi.mocked(handleAuthRequest)
    handleAuthMock.mockResolvedValue(mockedResult)

    const { instance, getInterceptor } = createAxiosInstanceMock()

    const config = {} as Config
    const queue = {} as RefreshQueue

    attachAuthInterceptor(instance, config, queue)

    const interceptor = getInterceptor()

    const request = {
      url: '/original'
    } as InternalAxiosRequestConfig

    const result = await interceptor(request)

    expect(handleAuthMock).toHaveBeenCalledTimes(1)
    expect(handleAuthMock).toHaveBeenCalledWith(request, config, queue)
    expect(result).toBe(mockedResult)
  })
})
