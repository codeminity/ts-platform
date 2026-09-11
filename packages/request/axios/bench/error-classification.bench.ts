import { AxiosError } from 'axios'
import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { mapErrorToEvent } from '../src/errors/error-to-event'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/axios/bench/error-classification.bench.ts'
const GROUP = 'mapErrorToEvent'

function errorWithStatus(status: number | undefined): AxiosError {
  const error = new AxiosError('error')

  if (status != null) {
    error.response = { status, statusText: '', headers: {}, config: {}, data: undefined } as never
  }

  return error
}

const knownStatusError = errorWithStatus(503)
const unknownStatusError = errorWithStatus(418)
const noResponseError = errorWithStatus(undefined)
const networkError = Object.assign(new AxiosError('network'), { code: 'ERR_NETWORK' })

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('known status code', async ({ bench }) => {
    const result = await bench('known status code', () => {
      mapErrorToEvent(knownStatusError)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('unknown status code', async ({ bench }) => {
    const result = await bench('unknown status code', () => {
      mapErrorToEvent(unknownStatusError)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('no response at all', async ({ bench }) => {
    const result = await bench('no response at all', () => {
      mapErrorToEvent(noResponseError)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('error.code short-circuit (ERR_NETWORK)', async ({ bench }) => {
    const result = await bench('error.code short-circuit (ERR_NETWORK)', () => {
      mapErrorToEvent(networkError)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
