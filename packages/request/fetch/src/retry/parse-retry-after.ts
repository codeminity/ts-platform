/**
 * Parses an HTTP `Retry-After` header value into milliseconds to wait,
 * supporting both the numeric-seconds and HTTP-date forms. Returns
 * `undefined` for a missing, empty, or unparseable value — never negative.
 * Duplicated identically in `@codeminity/axios`; see
 * [ADR-007](https://github.com/codeminity/ts-platform/blob/main/packages/request/core/DECISIONS.md#adr-007-http-status-classification-stays-adapter-local)
 * for why this stays adapter-local instead of living in `request-core`.
 */
export function parseRetryAfter(headerValue: string | null | undefined): number | undefined {
  const seconds = Number(headerValue)

  if (Number.isFinite(seconds)) {
    return Math.max(seconds, 0) * 1000
  }

  // `Date.parse` requires a `string` argument; `Number()` above already
  // treats a missing/null header the same as an unparseable one, so
  // coercing to `''` here (also unparseable) preserves that behavior.
  // Stryker disable next-line StringLiteral: equivalent mutant — any
  // fallback string that isn't itself a valid date produces the same
  // NaN result, so the exact placeholder content can't change behavior.
  const dateMs = Date.parse(headerValue ?? '')

  if (Number.isNaN(dateMs)) {
    return undefined
  }

  return Math.max(dateMs - Date.now(), 0)
}
