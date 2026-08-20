import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { attachAuthInterceptor as AttachAuthInterceptor } from './auth/attach-auth.js'
import type { attachResponseInterceptor as AttachResponseInterceptor } from './shared/attach-response.js'
import type { AxiosInstance, AxiosStatic } from 'axios'

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

  it('uses an empty codeminity config when not provided', async () => {
    const { create } = await import('./create.js')

    create()

    expect(attachAuthInterceptor).toHaveBeenCalledWith(instance, {}, expect.any(Object))

    expect(attachResponseInterceptor).toHaveBeenCalledWith(instance, {})
  })
})
