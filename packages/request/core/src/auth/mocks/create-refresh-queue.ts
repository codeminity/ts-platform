import { vi } from 'vitest'

import type { RefreshQueue } from '../refresh-queue.interface'

export function createRefreshQueue(): RefreshQueue & {
  run: ReturnType<typeof vi.fn>
} {
  let current: Promise<void> | null = null

  const run = vi.fn(async (task: () => Promise<void>) => {
    current ??= (async () => {
      try {
        await task()
      } finally {
        current = null
      }
    })()

    return current
  })

  return { run }
}
