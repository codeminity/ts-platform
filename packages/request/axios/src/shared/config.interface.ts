import type { AuthConfig } from '@codeminity/request-core'

import type { CallbackConfig } from './callback-config.interface'
import type { RetryConfig } from '../retry/retry-config.interface'

/**
 * @public
 */
export interface Config extends AuthConfig, CallbackConfig, RetryConfig {}
