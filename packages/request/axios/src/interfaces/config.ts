import type { AuthConfig } from '@codeminity/request-core'

import type { CallbackConfig } from './callback-config'
import type { RetryConfig } from './retry-config'

export interface Config extends AuthConfig, CallbackConfig, RetryConfig {}
