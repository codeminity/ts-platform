import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { createAuthorizationHeader } from '../src/auth/create-auth-header'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/fetch/bench/create-auth-header.bench.ts'
const GROUP = 'createAuthorizationHeader (fetch)'

const existingHeaders = { Accept: 'application/json', 'X-Request-Id': 'abc123' }

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('no existing headers', async ({ bench }) => {
    const result = await bench('no existing headers', () => {
      createAuthorizationHeader(undefined, 'token')
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('several existing headers preserved', async ({ bench }) => {
    const result = await bench('several existing headers preserved', () => {
      createAuthorizationHeader(existingHeaders, 'token')
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
