import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AxiosInstance } from 'axios'

const instance = {} as AxiosInstance

const createMock = vi.fn(() => instance)

const attachAuthInterceptor = vi.fn()
const attachResponseInterceptor = vi.fn()

vi.mock('axios', () => ({
  default: {
    create: createMock
  }
}))

vi.mock('../../../src/interceptors/attach-auth', () => ({
  attachAuthInterceptor
}))

vi.mock('../../../src/interceptors/attach-response', () => ({
  attachResponseInterceptor
}))

describe('create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an axios instance with the provided axios config', async () => {
    const { create } = await import('../../../src/factories/create')

    const config = {
      baseURL: 'https://api.example.com',
      timeout: 5000,
      codeminity: {
        getToken: vi.fn()
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
    const { create } = await import('../../../src/factories/create')

    const codeminity = {
      getToken: vi.fn()
    }

    create({ codeminity })

    expect(attachAuthInterceptor).toHaveBeenCalledTimes(1)
    expect(attachResponseInterceptor).toHaveBeenCalledTimes(1)

    expect(attachAuthInterceptor).toHaveBeenCalledWith(instance, codeminity, expect.any(Object))

    expect(attachResponseInterceptor).toHaveBeenCalledWith(instance, codeminity)
  })

  it('uses an empty codeminity config when not provided', async () => {
    const { create } = await import('../../../src/factories/create')

    create()

    expect(attachAuthInterceptor).toHaveBeenCalledWith(instance, {}, expect.any(Object))

    expect(attachResponseInterceptor).toHaveBeenCalledWith(instance, {})
  })

  it('gives each axios instance its own refresh queue (per-instance isolation, ADR-004)', async () => {
    const { create } = await import('../../../src/factories/create')

    create({ codeminity: { getToken: vi.fn() } })
    create({ codeminity: { getToken: vi.fn() } })

    const firstCallQueue = attachAuthInterceptor.mock.calls[0]?.[2] as unknown
    const secondCallQueue = attachAuthInterceptor.mock.calls[1]?.[2] as unknown

    expect(firstCallQueue).toBeDefined()
    expect(secondCallQueue).toBeDefined()
    expect(firstCallQueue).not.toBe(secondCallQueue)
  })
})
