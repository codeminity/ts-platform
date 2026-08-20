import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthConfig } from '@codeminity/request-core'

import type { attachAuthInterceptor as AttachAuthInterceptor } from './auth/attach-auth.js'
import type { attachResponseInterceptor as AttachResponseInterceptor } from './shared/attach-response.js'
import type { AxiosInstance, AxiosStatic } from 'axios'

type GetToken = NonNullable<AuthConfig['getToken']>

const instance = {} as AxiosInstance

const createMock = vi.fn<AxiosStatic['create']>(() => instance)

const attachAuthInterceptor = vi.fn<typeof AttachAuthInterceptor>()
const attachResponseInterceptor = vi.fn<typeof AttachResponseInterceptor>()

vi.mock(import('axios'), () => ({
  // Only `axios.create()` is ever called by the code under test — the rest
  // of the real AxiosStatic shape (Cancel, CancelToken, Axios, ...) is
  // deliberately not part of this mock.
  default: { create: createMock } as unknown as AxiosStatic
}))

vi.mock(import('./auth/attach-auth.js'), () => ({
  attachAuthInterceptor
}))

vi.mock(import('./shared/attach-response.js'), () => ({
  attachResponseInterceptor
}))

describe('create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an axios instance with the provided axios config', async () => {
    const { create } = await import('./create.js')

    const config = {
      baseURL: 'https://api.example.com',
      timeout: 5000,
      codeminity: {
        getToken: vi.fn<GetToken>()
      }
    }

    const result = create(config)

    expect(createMock).toHaveBeenCalledWith({
      baseURL: 'https://api.example.com',
      timeout: 5000
    })

    expect(result).toBe(instance)
  })

  it('attaches both interceptors', async () => {
    const { create } = await import('./create.js')

    const codeminity = {
      getToken: vi.fn<GetToken>()
    }

    create({ codeminity })

    expect(attachAuthInterceptor).toHaveBeenCalledTimes(1)
    expect(attachResponseInterceptor).toHaveBeenCalledTimes(1)

    expect(attachAuthInterceptor).toHaveBeenCalledWith(instance, codeminity, expect.any(Object))

    expect(attachResponseInterceptor).toHaveBeenCalledWith(instance, codeminity)
  })

  it('uses an empty codeminity config when not provided', async () => {
    const { create } = await import('./create.js')

    create()

    expect(attachAuthInterceptor).toHaveBeenCalledWith(instance, {}, expect.any(Object))

    expect(attachResponseInterceptor).toHaveBeenCalledWith(instance, {})
  })

  it('gives each axios instance its own refresh queue (per-instance isolation, ADR-004)', async () => {
    const { create } = await import('./create.js')

    create({ codeminity: { getToken: vi.fn<GetToken>() } })
    create({ codeminity: { getToken: vi.fn<GetToken>() } })

    const firstCallQueue = attachAuthInterceptor.mock.calls[0]?.[2] as unknown
    const secondCallQueue = attachAuthInterceptor.mock.calls[1]?.[2] as unknown

    expect(firstCallQueue).toBeDefined()
    expect(secondCallQueue).toBeDefined()
    expect(firstCallQueue).not.toBe(secondCallQueue)
  })
})
