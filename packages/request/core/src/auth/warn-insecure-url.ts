const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function isInsecureParsedUrl(parsed: URL): boolean {
  return parsed.protocol !== 'https:' && !LOOPBACK_HOSTNAMES.has(parsed.hostname)
}

/**
 * Returns true if `url` would carry credentials over a connection that is
 * neither HTTPS nor a loopback address (`localhost`, `127.0.0.1`, `::1`).
 * Returns false for any string that isn't a parseable URL, so a malformed
 * or relative URL is never treated as insecure by this check.
 *
 * @public
 */
export function isInsecureUrl(url: string): boolean {
  try {
    return isInsecureParsedUrl(new URL(url))
  } catch {
    return false
  }
}

// Deliberately process-wide, not scoped per adapter instance: the goal is
// "warn about this origin once, period" — if five misconfigured instances
// all pointed at the same insecure origin each logged their own warning,
// that's spam, not five independent facts worth knowing. This is a narrow,
// documented exception to the package's own no-global-state rule — see
// DECISIONS.md#adr-006-no-global-state.
const warnedOrigins = new Set<string>()

/**
 * Logs a one-time `console.warn` per origin when `url` is insecure per
 * {@link isInsecureUrl} — e.g. an `Authorization` header or cookie about to
 * be sent over plain HTTP. Deduplicated per origin so a misconfigured
 * `baseURL` doesn't spam the console on every request.
 *
 * @public
 */
export function warnIfInsecureUrl(url: string): void {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return
  }

  if (!isInsecureParsedUrl(parsed)) return
  if (warnedOrigins.has(parsed.origin)) return

  warnedOrigins.add(parsed.origin)

  console.warn(
    `[codeminity] Sending credentials to a non-HTTPS origin (${parsed.origin}). ` +
      'Credentials should only be sent over HTTPS.'
  )
}
