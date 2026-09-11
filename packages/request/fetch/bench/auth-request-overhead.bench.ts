import { afterAll, describe, test } from 'vitest'

import { TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { handleAuthRequest } from '../src/auth/handle-auth-request'
import { createRequestInit } from '../src/shared/mocks/create-request-init'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'
import type { Config } from '../src/shared/config.interface'

const FILE = 'packages/request/fetch/bench/auth-request-overhead.bench.ts'
const GROUP = 'handleAuthRequest (fetch)'

const TEST_INPUT = '/test'

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('JWT mode, attaches Authorization header', async ({ bench }) => {
    const result = await bench('JWT mode, attaches Authorization header', async () => {
      const config = createAuthConfig({ getToken: () => Promise.resolve('token') }) as Config

      await handleAuthRequest(TEST_INPUT, createRequestInit(), config, createRefreshQueueMock())
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('COOKIE mode, sets credentials: include', async ({ bench }) => {
    const result = await bench('COOKIE mode, sets credentials: include', async () => {
      const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config

      await handleAuthRequest(TEST_INPUT, createRequestInit(), config, createRefreshQueueMock())
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('skipAuth: true, bypasses auth entirely', async ({ bench }) => {
    const result = await bench('skipAuth: true, bypasses auth entirely', async () => {
      const config = createAuthConfig({ getToken: () => Promise.resolve('token') }) as Config

      await handleAuthRequest(
        TEST_INPUT,
        createRequestInit({ codeminity: { skipAuth: true } }),
        config,
        createRefreshQueueMock()
      )
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
