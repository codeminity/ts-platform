import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { getAxiosInstance } from '../../../src/utils/get-axios-instance'

vi.mock('axios', () => ({
  default: vi.fn()
}))

describe('getAxiosInstance', () => {
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
