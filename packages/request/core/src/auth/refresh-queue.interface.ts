/**
 * Coordinates concurrent async tasks so overlapping calls share a single
 * in-flight execution instead of running independently.
 *
 * @public
 */
export interface RefreshQueue {
  /** Runs `task`, or returns the currently in-flight promise if one is already running. */
  run(task: () => Promise<void>): Promise<void>
}
