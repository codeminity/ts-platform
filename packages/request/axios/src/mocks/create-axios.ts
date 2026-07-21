import { vi } from 'vitest'

import type { AxiosInstance } from 'axios'

type ErrorInterceptor = (error: unknown) => Promise<unknown>

interface AxiosMock {
  instance: AxiosInstance
  request: ReturnType<typeof vi.fn>
  getErrorInterceptor: () => ErrorInterceptor
}

export function createAxiosMock(): AxiosMock {
  let errorInterceptor!: ErrorInterceptor

  const request = vi.fn()

  const instance = {
    request,
    interceptors: {
      response: {
        use: (_success: unknown, errorFn: ErrorInterceptor) => {
          errorInterceptor = errorFn
        }
      }
    }
  } as unknown as AxiosInstance

  return {
    instance,
    request,
    getErrorInterceptor: () => errorInterceptor
  }
}
