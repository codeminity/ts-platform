import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { getAxiosInstance } from './get-axios-instance.js'

vi.mock(import('axios'), () => ({
  // `axios` itself is called directly as a function here — the rest of the
  // real AxiosStatic shape is deliberately not part of this mock.
  default: vi.fn<(config: unknown) => unknown>() as unknown as typeof axios
}))

describe(getAxiosInstance, () => {
  it('delegates calls to axios and returns its result', () => {
    const axiosResult = { mocked: true }

    vi.mocked(axios).mockReturnValue(axiosResult as never)

    const config = {
      url: '/test',
      method: 'GET'
    }

    const result = getAxiosInstance(config as never)

    expect(axios).toHaveBeenCalledWith(config)
    expect(result).toBe(axiosResult)
  })
})
