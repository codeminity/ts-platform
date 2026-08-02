import { afterAll, beforeAll, bench, describe } from 'vitest'

import { isInsecureUrl, warnIfInsecureUrl } from '../src/auth/warn-insecure-url'

describe('isInsecureUrl / warnIfInsecureUrl', () => {
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

  bench('isInsecureUrl, https URL', () => {
    isInsecureUrl('https://api.example.com/path')
  })

  bench('isInsecureUrl, http URL', () => {
    isInsecureUrl('http://api.example.com/path')
  })

  bench('isInsecureUrl, unparseable string', () => {
    isInsecureUrl('not a url')
  })

  bench('warnIfInsecureUrl, repeated calls against one insecure origin', () => {
    warnIfInsecureUrl('http://bench.example.com/path')
  })
})
