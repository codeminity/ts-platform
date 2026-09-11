import { afterAll, describe, test } from 'vitest'

import { TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { writeBenchFileReport, toMeanNs } from '../../../../scripts/bench/bench-file-report.js'
import { handleAuthRequest } from '../src/auth/handle-auth-request'
import { createRequestConfig } from '../src/shared/mocks/create-request-config'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/axios/bench/auth-request-overhead.bench.ts'
const GROUP = 'handleAuthRequest (axios)'

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('JWT mode, attaches Authorization header', async ({ bench }) => {
    const result = await bench('JWT mode, attaches Authorization header', async () => {
      const config = createAuthConfig({ getToken: () => Promise.resolve('token') })

      await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('COOKIE mode, sets withCredentials', async ({ bench }) => {
    const result = await bench('COOKIE mode, sets withCredentials', async () => {
      const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })

      await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('skipAuth: true, bypasses auth entirely', async ({ bench }) => {
    const result = await bench('skipAuth: true, bypasses auth entirely', async () => {
      const config = createAuthConfig({ getToken: () => Promise.resolve('token') })

      await handleAuthRequest(
        createRequestConfig({ codeminity: { skipAuth: true } }),
        config,
        createRefreshQueueMock()
      )
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
