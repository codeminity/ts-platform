/**
 * Resolves after the given number of milliseconds. Used to space out retry attempts.
 *
 * @public
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
