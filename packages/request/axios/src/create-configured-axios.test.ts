import axios from 'axios'
import { describe, expect, it } from 'vitest'

import { configuredAxios } from './create-configured-axios.js'
import { create } from './create.js'

import type { AxiosAdapter } from 'axios'

function fakeAdapter(
  handler: (config: Parameters<AxiosAdapter>[0]) => { data?: unknown; status?: number }
): AxiosAdapter {
  return (config) => {
    const result = handler(config)
    return Promise.resolve({
      data: result.data,
      status: result.status ?? 200,
      statusText: 'OK',
      headers: {},
      config
    })
  }
}

describe('configuredAxios', () => {
  it("overrides create with this package's wired create, not axios's own", () => {
    expect(configuredAxios.create).toBe(create)
    expect(configuredAxios.create).not.toBe(axios.create)
  })

  it('configuredAxios.create(...) actually wires the auth interceptor, not a plain axios instance', async () => {
    let seenAuthHeader: string | undefined

    const api = configuredAxios.create({
      adapter: fakeAdapter((config) => {
        const headers = config.headers as unknown as {
          Authorization?: string
          get?: (k: string) => string
        }
        seenAuthHeader = headers.Authorization ?? headers.get?.('Authorization')
        return { data: { ok: true } }
      }),
      codeminity: {
        getToken: () => 'real-token'
      }
    })

    await api.get('/secure')

    expect(seenAuthHeader).toBe('Bearer real-token')
  })

  it('stays callable like plain axios, independent of create()', () => {
    expect(configuredAxios).toBeTypeOf('function')
  })
})
