import { afterAll, beforeAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { isInsecureUrl, warnIfInsecureUrl } from '../src/auth/warn-insecure-url'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/core/bench/warn-insecure-url.bench.ts'
const GROUP = 'isInsecureUrl / warnIfInsecureUrl'

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []
  let originalWarn: typeof console.warn

  // warnIfInsecureUrl warns at most once per origin, so after its first
  // call below every further call to it (for the same origin) takes the
  // "already warned, skip" fast path — that's also the realistic case for
  // a hot request loop against one baseURL, not a benchmark artifact.
  // console.warn itself is silenced for the duration so its (real) I/O
  // cost doesn't skew the one call that actually warns.
  beforeAll(() => {
    originalWarn = console.warn
    console.warn = () => {
      /* silence the expected single warning while benchmarking */
    }
  })

  afterAll(() => {
    console.warn = originalWarn
  })

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('isInsecureUrl, https URL', async ({ bench }) => {
    const result = await bench('isInsecureUrl, https URL', () => {
      isInsecureUrl('https://api.example.com/path')
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('isInsecureUrl, http URL', async ({ bench }) => {
    const result = await bench('isInsecureUrl, http URL', () => {
      isInsecureUrl('http://api.example.com/path')
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('isInsecureUrl, unparseable string', async ({ bench }) => {
    const result = await bench('isInsecureUrl, unparseable string', () => {
      isInsecureUrl('not a url')
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('warnIfInsecureUrl, repeated calls against one insecure origin', async ({ bench }) => {
    const result = await bench(
      'warnIfInsecureUrl, repeated calls against one insecure origin',
      () => {
        warnIfInsecureUrl('http://bench.example.com/path')
      }
    ).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
