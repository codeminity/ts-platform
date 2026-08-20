import { describe, expect, it } from 'vitest'

import { findRedundantTests } from './find-redundant-tests'

import type { MutationReport } from './find-redundant-tests'

function test(id: string, name: string) {
  return { id, name }
}

describe(findRedundantTests, () => {
  it('returns nothing for an empty report', () => {
    const report: MutationReport = { files: {} }

    expect(findRedundantTests(report)).toStrictEqual([])
  })

  it('keeps a test that is the sole killer of a mutant', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed', killedBy: ['0'], coveredBy: ['0'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'foo works')] }
      }
    }

    expect(findRedundantTests(report)).toStrictEqual([])
  })

  it('removes one of two tests that both independently kill AND cover the same mutant, in the same file', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed', killedBy: ['0', '1'], coveredBy: ['0', '1'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'first'), test('1', 'second')] }
      }
    }

    const candidates = findRedundantTests(report)

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.confidence).toBe('confirmed')
    expect(['first', 'second']).toContain(candidates[0]?.name)
  })

  it('ignores a non-Killed mutant for the mutation-kill check, but still counts its coveredBy for the coverage check', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Survived', killedBy: [], coveredBy: ['0'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'unrelated')] }
      }
    }

    // A Survived mutant contributes no killer evidence, but "unrelated" is
    // its ONLY coverer — removing it would drop real statement coverage,
    // so it must stay even though it never appears in any killerSets.
    expect(findRedundantTests(report)).toStrictEqual([])
  })

  it('treats a Killed mutant with no killedBy/coveredBy as contributing no evidence', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed' }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'anything')] }
      }
    }

    expect(findRedundantTests(report)).toStrictEqual([
      { file: 'src/foo.test.ts', name: 'anything', confidence: 'no-mutation-signal' }
    ])
  })

  it('never treats a different file (e.g. an integration test) as grounding a mutation-kill removal', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed', killedBy: ['0', '1'], coveredBy: ['0', '1'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'direct unit test')] },
        'src/index.integration.test.ts': { tests: [test('1', 'exercises foo indirectly')] }
      }
    }

    // "direct unit test" is foo.ts's only own-scope killer — even though the
    // integration test independently kills the same mutant, it must never
    // be used to justify removing the dedicated test, and the integration
    // test itself must never be a candidate (it isn't anyone's own scope).
    expect(findRedundantTests(report)).toStrictEqual([])
  })

  it('does allow a different file to ground the SEPARATE real-coverage check', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [
            { status: 'Killed', killedBy: ['0', '2'], coveredBy: ['0', '1', '2'] },
            { status: 'Killed', killedBy: ['2'], coveredBy: ['1', '2'] }
          ]
        }
      },
      testFiles: {
        'src/foo.test.ts': {
          tests: [test('0', 'redundant unit test'), test('2', 'anchor unit test')]
        },
        'src/index.integration.test.ts': { tests: [test('1', 'exercises foo indirectly')] }
      }
    }

    // "redundant unit test" isn't needed for mutation-kill (mutant 1 is
    // also killed by "anchor unit test", same file) nor for coverage
    // (mutant 1 is also covered by the integration test AND anchor;
    // mutant 2 is covered by both integration and anchor too) — coverage
    // is real and doesn't care which file the backup lives in.
    const candidates = findRedundantTests(report)

    expect(candidates).toStrictEqual([
      { file: 'src/foo.test.ts', name: 'redundant unit test', confidence: 'confirmed' }
    ])
  })

  it('never removes a property-based test, even when it is the redundant side', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed', killedBy: ['0', '1'], coveredBy: ['0', '1'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'example case')] },
        'src/foo.property.test.ts': { tests: [test('1', 'property holds for any input')] }
      }
    }

    expect(findRedundantTests(report)).toStrictEqual([
      { file: 'src/foo.test.ts', name: 'example case', confidence: 'confirmed' }
    ])
  })

  it('ignores a killedBy/coveredBy id that is not unique across test files', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed', killedBy: ['0'], coveredBy: ['0'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'foo case')] },
        'src/bar.test.ts': { tests: [test('0', 'bar case (id collision)')] }
      }
    }

    // The bare id "0" is ambiguous (used by two different test files), so
    // it can't ground anything — "foo case" ends up with zero attributed
    // evidence, the same "no signal" situation as a test whose source file
    // has no mutants at all. "bar case" is untouched because src/bar.ts
    // isn't in this report at all, so bar.test.ts was never anyone's
    // own-scope group to begin with.
    expect(findRedundantTests(report)).toStrictEqual([
      { file: 'src/foo.test.ts', name: 'foo case', confidence: 'no-mutation-signal' }
    ])
  })

  it('ignores a killedBy id that matches no known test', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Killed', killedBy: ['does-not-exist'] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'foo case')] }
      }
    }

    expect(findRedundantTests(report)).toStrictEqual([
      { file: 'src/foo.test.ts', name: 'foo case', confidence: 'no-mutation-signal' }
    ])
  })

  it('flags a source file whose only mutant is static/ignored (empty coveredBy) as no-mutation-signal', () => {
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [{ status: 'Ignored', killedBy: [], coveredBy: [] }]
        }
      },
      testFiles: {
        'src/foo.test.ts': { tests: [test('0', 'foo case')] }
      }
    }

    expect(findRedundantTests(report)).toStrictEqual([
      { file: 'src/foo.test.ts', name: 'foo case', confidence: 'no-mutation-signal' }
    ])
  })

  it('resolves cascading redundancy: removing A and C leaves B newly essential, needing a second pass', () => {
    // Mutant 1 is killed/covered by A and B; mutant 2 by B and C. Processed
    // in order A, B, C within one pass: A is safe (B still backs mutant 1)
    // and gets removed; B is then checked and is NOT safe (its only backup
    // for mutant 1 was A, just removed) and stays; C is safe (B still backs
    // mutant 2) and gets removed. A second pass then re-checks B alone and
    // finds it still unsafe (A is gone), so the loop settles with B as the
    // sole remaining test — proving the peel is a fixed point, not a single
    // greedy pass.
    const report: MutationReport = {
      files: {
        'src/foo.ts': {
          mutants: [
            { status: 'Killed', killedBy: ['a', 'b'], coveredBy: ['a', 'b'] },
            { status: 'Killed', killedBy: ['b', 'c'], coveredBy: ['b', 'c'] }
          ]
        }
      },
      testFiles: {
        'src/foo.test.ts': {
          tests: [
            test('a', 'covers first half'),
            test('b', 'covers both'),
            test('c', 'covers second half')
          ]
        }
      }
    }

    const candidates = findRedundantTests(report)

    expect(candidates.map((c) => c.name).sort()).toStrictEqual([
      'covers first half',
      'covers second half'
    ])
    expect(candidates.every((c) => c.confidence === 'confirmed')).toBe(true)
  })

  it('handles a test file with no matching source file (never becomes a candidate)', () => {
    const report: MutationReport = {
      files: {},
      testFiles: {
        'src/orphan.test.ts': { tests: [test('0', 'orphaned')] }
      }
    }

    expect(findRedundantTests(report)).toStrictEqual([])
  })
})
