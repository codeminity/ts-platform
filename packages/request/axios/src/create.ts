import axios from 'axios'

import { createRefreshQueue } from '@codeminity/request-core'

import { attachAuthInterceptor } from './auth/attach-auth.js'
import { attachResponseInterceptor } from './shared/attach-response.js'

import type { AxiosInstance, CreateAxiosDefaults } from 'axios'

/**
 * Creates an Axios instance wired with `@codeminity/axios` behavior — auth
 * lifecycle, refresh coordination, and retry — configured via `config.codeminity`.
 *
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
