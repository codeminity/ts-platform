import { describe, expect, it, type Mock, vi } from 'vitest'

import { create, default as codeminityAxios } from '../../src/index'

import type { AxiosAdapter, AxiosError } from 'axios'

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

describe('package entry point (real, unmocked)', () => {
  it('create() returns a working axios instance without throwing (regression test for self-mutating axios singleton)', async () => {
    const api = create({
      adapter: fakeAdapter(() => ({ data: { ok: true } }))
    })

    const res = await api.get('/ping')
    expect(res.data).toEqual({ ok: true })
  })

  it('create() can be called multiple times without recursion or shared-state corruption', async () => {
    const apiA = create({ adapter: fakeAdapter(() => ({ data: { from: 'a' } })) })
    const apiB = create({ adapter: fakeAdapter(() => ({ data: { from: 'b' } })) })

    const [resA, resB] = await Promise.all([apiA.get('/x'), apiB.get('/x')])

    expect(resA.data).toEqual({ from: 'a' })
    expect(resB.data).toEqual({ from: 'b' })
  })

  it('default export stays callable and usable like plain axios, independent of create()', () => {
    expect(typeof codeminityAxios).toBe('function')

    const spy: Mock<() => never> = vi.spyOn(codeminityAxios, 'create' as never)
    create({ adapter: fakeAdapter(() => ({ data: {} })) })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('attaches Authorization header end-to-end via getToken', async () => {
    let seenAuthHeader: string | undefined

    const api = create({
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

  it('emits mapped error events end-to-end on HTTP error responses', async () => {
    let seenEvent: string | undefined

    const api = create({
      adapter: fakeAdapter(() => {
        const err = new Error('Not Found') as AxiosError
        err.isAxiosError = true
        // @ts-expect-error minimal shape for test purposes
        err.response = { status: 404 }
        err.toJSON = () => ({})
        throw err
      }),
      codeminity: {
        onEvent: (event) => {
          seenEvent = event
        }
      }
    })

    await expect(api.get('/missing')).rejects.toThrow()
    expect(seenEvent).toBe('not_found')
  })
})
