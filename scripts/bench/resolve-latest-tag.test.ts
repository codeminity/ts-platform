import { describe, expect, it } from 'vitest'

import { resolveLatestTag } from './resolve-latest-tag'

describe(resolveLatestTag, () => {
  it('returns undefined when the package has no tags at all', () => {
    const tags = ['@codeminity/axios@1.0.0', '@codeminity/fetch@1.0.0']

    expect(resolveLatestTag(tags, '@codeminity/ui-kit')).toBeUndefined()
  })

  it('returns the only tag when exactly one exists for the package', () => {
    const tags = ['@codeminity/axios@1.0.0']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@1.0.0')
  })

  it('picks the highest major version among multiple tags', () => {
    const tags = ['@codeminity/axios@1.0.0', '@codeminity/axios@2.0.0', '@codeminity/axios@1.9.9']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@2.0.0')
  })

  it('picks the highest minor version when major versions tie', () => {
    const tags = ['@codeminity/axios@1.2.0', '@codeminity/axios@1.10.0', '@codeminity/axios@1.9.0']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@1.10.0')
  })

  it('picks the highest patch version when major and minor tie', () => {
    const tags = ['@codeminity/axios@1.2.3', '@codeminity/axios@1.2.10', '@codeminity/axios@1.2.4']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@1.2.10')
  })

  it('never matches a different package that merely shares a prefix', () => {
    const tags = ['@codeminity/fetch-extra@9.0.0']

    expect(resolveLatestTag(tags, '@codeminity/fetch')).toBeUndefined()
  })

  it('treats a missing version segment as lower than a present one (shorter tag first)', () => {
    // Not a real tag shape this repo produces, but exercises the `?? 0`
    // fallback when comparing version arrays of different lengths — with
    // the shorter one first in the input array.
    const tags = ['@codeminity/axios@1.2', '@codeminity/axios@1.2.1']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@1.2.1')
  })

  it('treats a missing version segment as lower than a present one (longer tag first)', () => {
    // Same as above with the array order reversed, so whichever position
    // the sort comparator's two parameters end up in, both directions of
    // the length-mismatch fallback get exercised.
    const tags = ['@codeminity/axios@1.2.1', '@codeminity/axios@1.2']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@1.2.1')
  })

  it('returns either tag when two tags for the same package have identical version parts', () => {
    const tags = ['@codeminity/axios@1.0.0', '@codeminity/axios@1.0.0']

    expect(resolveLatestTag(tags, '@codeminity/axios')).toBe('@codeminity/axios@1.0.0')
  })

  it('filters out every other package before comparing versions', () => {
    const tags = [
      '@codeminity/axios@1.0.0',
      '@codeminity/fetch@5.0.0',
      '@codeminity/request-core@9.0.0'
    ]

    expect(resolveLatestTag(tags, '@codeminity/fetch')).toBe('@codeminity/fetch@5.0.0')
  })
})
