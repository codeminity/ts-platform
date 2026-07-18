import axios from 'axios'

import { createRefreshQueue } from '@codeminity/request-core'

import { attachAuthInterceptor } from '../interceptors/attach-auth'
import { attachResponseInterceptor } from '../interceptors/attach-response'

import type { AxiosInstance, CreateAxiosDefaults } from 'axios'

/**
 * @public
 */
export function create(config: CreateAxiosDefaults = {}): AxiosInstance {
  const { codeminity, ...axiosConfig } = config

  const instance = axios.create(axiosConfig)

  const refreshQueue = createRefreshQueue()

  attachAuthInterceptor(instance, codeminity ?? {}, refreshQueue)
  attachResponseInterceptor(instance, codeminity ?? {})

  return instance
}
