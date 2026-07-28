/**
 * The result of a single fetch attempt that needs classification: a `Response`
 * (possibly not `ok`) when the call resolved, or the thrown value (network
 * failure, abort, timeout) when it didn't. Always carries the original request
 * (before auth was applied, so it never includes an attached `Authorization`
 * header) so callbacks can correlate an event back to what caused it.
 *
 * @public
 */
export interface FetchOutcome {
  /** The `input` this attempt was made with, exactly as passed to the function `createFetch` returns. */
  input: RequestInfo | URL
  /** The `init` this attempt was made with, before auth was applied — never includes the `Authorization` header this package attaches. */
  init: RequestInit
  /** The response received, if the fetch call resolved at all. */
  response?: Response
  /** The thrown value, if the fetch call rejected instead of resolving. */
  error?: unknown
}
