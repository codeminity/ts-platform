import { handleRefreshToken } from './refresh-token'

/**
 * Re-exports {@link handleRefreshToken} through a mutable object so adapter
 * test suites can `vi.spyOn(dependencies, 'handleRefreshToken')` — spying on a
 * single function without mocking the rest of this module's exports.
 *
 * @public
 */
export const dependencies = {
  handleRefreshToken
}
