import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { classifyOutcome } from '../src/errors/outcome-to-event'
import { createFetchOutcome } from '../src/shared/mocks/create-fetch-outcome'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/fetch/bench/error-classification.bench.ts'
const GROUP = 'classifyOutcome'

const knownStatusOutcome = createFetchOutcome({ response: new Response(null, { status: 503 }) })
const unknownStatusOutcome = createFetchOutcome({ response: new Response(null, { status: 418 }) })
const abortOutcome = createFetchOutcome({ error: new DOMException('aborted', 'AbortError') })
const networkOutcome = createFetchOutcome({ error: new TypeError('network') })

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('known status code', async ({ bench }) => {
    const result = await bench('known status code', () => {
      classifyOutcome(knownStatusOutcome)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('unknown status code', async ({ bench }) => {
    const result = await bench('unknown status code', () => {
      classifyOutcome(unknownStatusOutcome)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('DOMException (AbortError)', async ({ bench }) => {
    const result = await bench('DOMException (AbortError)', () => {
      classifyOutcome(abortOutcome)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('TypeError (network failure)', async ({ bench }) => {
    const result = await bench('TypeError (network failure)', () => {
      classifyOutcome(networkOutcome)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
