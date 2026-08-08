const DEFAULT_MAX_DELAY_MS = 300_000

/**
 * Reconciles a configured retry delay with a server-suggested wait time
 * (e.g. parsed from an HTTP `Retry-After` header, a gRPC `RetryInfo`, or any
 * other transport's equivalent) — takes whichever asks for longer, capped so
 * a misconfigured or malicious server can't stall a client indefinitely.
 * Knows nothing about where `suggestedDelayMs` came from; parsing a
 * transport's own wait-hint format into a plain millisecond number is each
 * adapter's own responsibility.
 *
 * @public
 */
export function resolveRetryDelay(
  configuredDelay: number,
  suggestedDelayMs?: number,
  maxDelayMs: number = DEFAULT_MAX_DELAY_MS
): number {
  return Math.min(Math.max(configuredDelay, suggestedDelayMs ?? 0), maxDelayMs)
}
