import axios from 'axios'

import { create } from './create.js'
import { getAxiosInstance } from './shared/get-axios-instance.js'

/**
 * A drop-in replacement for Axios's own default export, with `create`
 * overridden to return an instance wired with `@codeminity/axios` behavior.
 *
 * `create` must be the last spread source: `Object.assign` applies sources
 * left to right, so putting `axios` after it would let axios's own
 * `create` silently win, losing every retry/auth interceptor this package
 * wires up.
 *
 * @public
 */
export const configuredAxios: typeof axios & { create: typeof create } = Object.assign(
  getAxiosInstance,
  axios,
  { create }
)
