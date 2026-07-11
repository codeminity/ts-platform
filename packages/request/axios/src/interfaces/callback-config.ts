import type { ErrorEvent } from '../types/error-event'
import type { AxiosError } from 'axios'

export interface CallbackConfig {
  onEvent?: (event: ErrorEvent, error: AxiosError) => void | Promise<void>
  onError?: (error: unknown) => void | Promise<void>
}
