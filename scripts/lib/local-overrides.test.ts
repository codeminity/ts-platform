import { describe, expect, it } from 'vitest'

import { buildLocalOverrides, toWorkspaceOverridesYaml } from './local-overrides'

describe('buildLocalOverrides', () => {
  it('returns undefined when no local packages are provided', () => {
    expect(buildLocalOverrides('@codeminity/axios')).toBeUndefined()
  })

  it('returns undefined when the only local package is the package itself', () => {
    const localPackages = new Map([['@codeminity/axios', '/tmp/axios-0.4.0.tgz']])

    expect(buildLocalOverrides('@codeminity/axios', localPackages)).toBeUndefined()
  })

  it('maps every other local package to a file specifier', () => {
    const localPackages = new Map([
      ['@codeminity/axios', '/tmp/axios-0.4.0.tgz'],
      ['@codeminity/request-core', '/tmp/request-core-0.4.0.tgz']
    ])

    expect(buildLocalOverrides('@codeminity/axios', localPackages)).toEqual({
      '@codeminity/request-core': 'file:/tmp/request-core-0.4.0.tgz'
    })
  })

  it('normalizes Windows-style backslashes to forward slashes', () => {
    const localPackages = new Map([
      ['@codeminity/axios', 'C:\\tmp\\axios-0.4.0.tgz'],
      ['@codeminity/request-core', 'C:\\tmp\\request-core-0.4.0.tgz']
    ])

    const overrides = buildLocalOverrides('@codeminity/axios', localPackages)

    expect(overrides?.['@codeminity/request-core']).toBe('file:C:/tmp/request-core-0.4.0.tgz')
  })
})

describe('toWorkspaceOverridesYaml', () => {
  it('serializes a single override', () => {
    expect(
      toWorkspaceOverridesYaml({
        '@codeminity/request-core': 'file:/tmp/request-core-0.4.0.tgz'
      })
    ).toBe('overrides:\n  "@codeminity/request-core": "file:/tmp/request-core-0.4.0.tgz"\n')
  })

  it('serializes multiple overrides, one per line', () => {
    const yaml = toWorkspaceOverridesYaml({
      '@codeminity/request-core': 'file:/tmp/request-core-0.4.0.tgz',
      '@codeminity/axios': 'file:/tmp/axios-0.4.0.tgz'
    })

    expect(yaml).toBe(
      'overrides:\n' +
        '  "@codeminity/request-core": "file:/tmp/request-core-0.4.0.tgz"\n' +
        '  "@codeminity/axios": "file:/tmp/axios-0.4.0.tgz"\n'
    )
  })
})
