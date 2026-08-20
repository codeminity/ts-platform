import { describe, expect, it } from 'vitest'

import { extractTypeScriptBlocks } from './extract-code-blocks'

describe(extractTypeScriptBlocks, () => {
  it('extracts a single ts code block with its starting line', () => {
    const markdown = ['# Title', '', '```ts', 'const a = 1', '```', ''].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([{ code: 'const a = 1', line: 3 }])
  })

  it('extracts a typescript-tagged block the same as a ts-tagged one', () => {
    const markdown = ['```typescript', 'const a = 1', '```'].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([{ code: 'const a = 1', line: 1 }])
  })

  it('extracts multiple blocks in order', () => {
    const markdown = [
      '```ts',
      'const a = 1',
      '```',
      'some text',
      '```ts',
      'const b = 2',
      '```'
    ].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([
      { code: 'const a = 1', line: 1 },
      { code: 'const b = 2', line: 5 }
    ])
  })

  it('ignores non-typescript code blocks', () => {
    const markdown = ['```bash', 'pnpm install', '```'].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([])
  })

  it('skips a block immediately preceded by the skip marker', () => {
    const markdown = [
      '<!-- validate-docs:skip -->',
      '```ts',
      'const a: Whatever = pseudoCode()',
      '```'
    ].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([])
  })

  it('does not skip a block when the skip marker precedes unrelated text', () => {
    const markdown = [
      '<!-- validate-docs:skip -->',
      'some other paragraph',
      '```ts',
      'const a = 1',
      '```'
    ].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([{ code: 'const a = 1', line: 3 }])
  })

  it('returns an empty array for markdown with no code blocks', () => {
    expect(extractTypeScriptBlocks('# Just a heading\n\nSome text.')).toStrictEqual([])
  })

  it('handles an unterminated code fence without throwing', () => {
    const markdown = ['```ts', 'const a = 1'].join('\n')

    expect(extractTypeScriptBlocks(markdown)).toStrictEqual([{ code: 'const a = 1', line: 1 }])
  })
})
