/**
 * @public
 */
export interface RefreshQueue {
  run(task: () => Promise<void>): Promise<void>
}
