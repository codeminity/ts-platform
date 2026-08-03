import type { AuthConfig } from '@codeminity/request-core'

import type { CallbackConfig } from './callback-config.interface.js'
import type { RetryConfig } from '../retry/retry-config.interface.js'

/**
 * Instance-level `codeminity` configuration: combines auth, lifecycle event
 * callbacks, and retry behavior for every request made through `createFetch`.
 *
 * @public
 */
export interface Config extends AuthConfig, CallbackConfig, RetryConfig {}
