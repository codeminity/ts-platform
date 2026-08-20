import { describe, expect, it } from 'vitest'

import { stripTests } from './strip-tests'

describe(stripTests, () => {
  it('removes a plain it() matching its qualified name', () => {
    const source = `describe('foo', () => {
  it('does a thing', () => {
    expect(1).toBe(1)
  })

  it('does another thing', () => {
    expect(2).toBe(2)
  })
})
`

    const result = stripTests(source, new Set(['foo does a thing']))

    expect(result.removed).toStrictEqual(['foo does a thing'])
    expect(result.source).not.toContain('does a thing')
    expect(result.source).toContain('does another thing')
  })

  it('removes a test() call the same as it()', () => {
    const source = `describe('foo', () => {
  test('works', () => {
    expect(1).toBe(1)
  })
})
`

    const result = stripTests(source, new Set(['foo works']))

    expect(result.removed).toStrictEqual(['foo works'])
    expect(result.source).not.toContain('works')
  })

  it('qualifies by the full nested describe stack, space-joined', () => {
    const source = `describe('outer', () => {
  describe('inner', () => {
    it('case', () => {
      expect(1).toBe(1)
    })
  })
})
`

    const result = stripTests(source, new Set(['outer inner case']))

    expect(result.removed).toStrictEqual(['outer inner case'])
    expect(result.source).not.toContain('case')
  })

  it('resolves a function/class describe title from its identifier, matching Vitest runtime resolution', () => {
    const source = `function myFn() {}

describe(myFn, () => {
  it('does the thing', () => {
    expect(1).toBe(1)
  })
})
`

    const result = stripTests(source, new Set(['myFn does the thing']))

    expect(result.removed).toStrictEqual(['myFn does the thing'])
    expect(result.source).not.toContain('does the thing')
  })

  it('never touches it.each — a table-generated test never matches, even if its resolved name is passed in', () => {
    const source = `describe('foo', () => {
  it.each([
    [1, 'one'],
    [2, 'two']
  ])('maps %i to %s', (n, word) => {
    expect(n).toBeTypeOf('number')
  })
})
`

    const result = stripTests(source, new Set(['foo maps 1 to one']))

    expect(result.removed).toStrictEqual([])
    expect(result.source).toBe(source)
  })

  it('treats an unresolvable describe title (neither string nor identifier) as empty, not a crash', () => {
    const source = `describe(obj.method, () => {
  it('case', () => {
    expect(1).toBe(1)
  })
})
`

    // "obj.method" is a property access, not a string literal or bare
    // identifier — its title can't be resolved, so the qualified name is
    // just the it() title alone (matched with a leading space stripped by
    // the join/filter, i.e. "case", not " case").
    const result = stripTests(source, new Set(['case']))

    expect(result.removed).toStrictEqual(['case'])
  })

  it('treats a describe() call with zero arguments as unresolvable, not a crash', () => {
    const source = 'describe()\n'

    const result = stripTests(source, new Set(['']))

    expect(result.removed).toStrictEqual([])
    expect(result.source).toBe(source)
  })

  it('treats an it() call with zero arguments as never matching, not a crash', () => {
    const source = `describe('foo', () => {
  it()
})
`

    const result = stripTests(source, new Set(['foo']))

    expect(result.removed).toStrictEqual([])
    expect(result.source).toBe(source)
  })

  it('leaves the source untouched when no name matches', () => {
    const source = `describe('foo', () => {
  it('case', () => {
    expect(1).toBe(1)
  })
})
`

    const result = stripTests(source, new Set(['nonexistent']))

    expect(result.removed).toStrictEqual([])
    expect(result.source).toBe(source)
  })

  it('removes multiple matches across multiple describes in one pass', () => {
    const source = `describe('a', () => {
  it('one', () => {
    expect(1).toBe(1)
  })
})

describe('b', () => {
  it('two', () => {
    expect(2).toBe(2)
  })
})
`

    const result = stripTests(source, new Set(['a one', 'b two']))

    expect(result.removed.sort()).toStrictEqual(['a one', 'b two'])
    expect(result.source).not.toContain("it('one'")
    expect(result.source).not.toContain("it('two'")
    expect(result.source).toContain("describe('a'")
    expect(result.source).toContain("describe('b'")
  })
})
