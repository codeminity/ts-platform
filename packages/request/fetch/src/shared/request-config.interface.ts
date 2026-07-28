import type { RetryConfig } from '../retry/retry-config.interface'

/**
 * Per-request `codeminity` override, passed via a single call's `FetchRequestInit`.
 *
 * @public
 */
export interface RequestConfig extends Pick<RetryConfig, 'retries' | 'retryDelay'> {
  /** Skips authentication handling for this request, regardless of `tokenMode`. */
  skipAuth?: boolean
}

/**
 * `RequestInit` extended with an optional per-request `codeminity` override —
 * the second parameter accepted by the function `createFetch` returns.
 *
 * @public
 */
export interface FetchRequestInit extends RequestInit {
  /** Per-request override of the instance-level `codeminity` config. */
  codeminity?: RequestConfig
}
