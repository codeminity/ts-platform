import axios from 'axios'

import { create } from './factories/create'
import { getAxiosInstance } from './utils/get-axios-instance'

import type { Config } from './interfaces/config'
import type { RequestConfig } from './interfaces/request-config'

declare module 'axios' {
  interface CreateAxiosDefaults {
    codeminity?: Config
  }

  interface AxiosRequestConfig {
    codeminity?: RequestConfig
  }
}

export default Object.assign(getAxiosInstance, axios, { create })

export * from 'axios'
export { create }
