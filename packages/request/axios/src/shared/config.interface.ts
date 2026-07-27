import type { AuthConfig } from '@codeminity/request-core'

import type { CallbackConfig } from './callback-config.interface'
import type { RetryConfig } from '../retry/retry-config.interface'

/**
 * Instance-level `codeminity` configuration: combines auth, lifecycle event
 * callbacks, and retry behavior for every request made through the instance.
 *
 * @public
 */
export interface Config extends AuthConfig, CallbackConfig, RetryConfig {}
