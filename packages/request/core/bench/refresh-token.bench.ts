import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { createRefreshQueue } from '../src/auth/create-refresh-queue'
import { handleRefreshToken } from '../src/auth/refresh-token'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'
import type { AuthConfig } from '../src/auth/auth-config.interface'

const FILE = 'packages/request/core/bench/refresh-token.bench.ts'
const GROUP = 'handleRefreshToken'

const noop = (): Promise<void> => Promise.resolve()

const expiredConfig: AuthConfig = {
  tokenMode: 'JWT',
  isTokenExpired: () => Promise.resolve(true),
  refreshToken: noop,
  onRefreshStart: noop,
  onRefreshSuccess: noop
}

const notExpiredConfig: AuthConfig = {
  tokenMode: 'JWT',
  isTokenExpired: () => Promise.resolve(false),
  refreshToken: noop
}

const noRefreshConfig: AuthConfig = { tokenMode: 'JWT' }

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('token expired, runs a fresh refresh through the queue', async ({ bench }) => {
    const result = await bench(
      'token expired, runs a fresh refresh through the queue',
      async () => {
        await handleRefreshToken(expiredConfig, createRefreshQueue())
      }
    ).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('token not expired, checks and returns without refreshing', async ({ bench }) => {
    const result = await bench(
      'token not expired, checks and returns without refreshing',
      async () => {
        await handleRefreshToken(notExpiredConfig, createRefreshQueue())
      }
    ).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('no isTokenExpired/refreshToken configured, returns immediately', async ({ bench }) => {
    const result = await bench(
      'no isTokenExpired/refreshToken configured, returns immediately',
      async () => {
        await handleRefreshToken(noRefreshConfig, createRefreshQueue())
      }
    ).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
