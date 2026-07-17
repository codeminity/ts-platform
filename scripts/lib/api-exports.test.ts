import fs, { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { extractExportsFromSource, extractExportsFromText, hasTypeExport } from './api-exports'

const tempDir = join(__dirname, '.tmp-api-exports-test')

describe('extractExportsFromSource', () => {
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('returns empty exports when entry file does not exist', () => {
    const result = extractExportsFromSource(tempDir)

    expect(result).toEqual({
      runtime: [],
      types: []
    })
  })

  it('extracts exports from src/index.ts', () => {
    mkdirSync(join(tempDir, 'src'), { recursive: true })

    writeFileSync(
      join(tempDir, 'src/index.ts'),
      `
        export const hello = 'world'
        export type User = { name: string }
      `
    )

    const result = extractExportsFromSource(tempDir)

    expect(result.runtime).toContain('hello')
    expect(result.types).toContain('User')
  })
})

describe('extractExportsFromText', () => {
  it('detects exported function/class/const/interface/type/enum declarations', () => {
    const source = `
      export function hello() {}
      export class Widget {}
      export const value = 1
      export interface User {}
      export type Config = {}
      export enum Mode { A, B }
    `

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual(expect.arrayContaining(['hello', 'Widget', 'value', 'Mode']))
    expect(result.types).toEqual(expect.arrayContaining(['User', 'Config', 'Mode']))
  })

  it('ignores non-exported (private) local declarations', () => {
    const source = `
      function helper() {}
      const internal = 1
      interface Hidden {}

      export function publicFn() {}
    `

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual(['publicFn'])
    expect(result.types).toEqual([])
  })

  it('detects named re-exports, the dominant style in this codebase', () => {
    const source = `
      export { create } from './factories/create'
      export { TokenModeEnum } from './enums/token-mode'
    `

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual(expect.arrayContaining(['create', 'TokenModeEnum']))
  })

  it('treats `export type { X }` as a type-only export, not a runtime export', () => {
    const source = `
      export type { AuthConfig } from './interfaces/auth-config'
    `

    const result = extractExportsFromText(source)

    expect(result.types).toEqual(['AuthConfig'])
    expect(result.runtime).toEqual([])
  })

  it('does not require a plain named re-export to also satisfy a .d.ts type pattern', () => {
    // Regression test: `export { create }` was previously also added to `types`,
    // which incorrectly required a matching `interface|type|class|enum create`
    // declaration in the built .d.ts — impossible for a plain function export.
    const source = `export { create } from './factories/create'`

    const result = extractExportsFromText(source)

    expect(result.types).not.toContain('create')
  })

  it('detects `export default ...` as a runtime export named "default"', () => {
    const source = `
      const instance = {}
      export default instance
    `

    const result = extractExportsFromText(source)

    expect(result.runtime).toContain('default')
  })

  it('does not expand `export * from` — the target package validates its own surface', () => {
    const source = `export * from 'axios'`

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual([])
    expect(result.types).toEqual([])
  })

  it('returns false for a declaration without the export keyword', () => {
    const source = `function notExported() {}`

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual([])
  })
})

describe('hasTypeExport', () => {
  it('matches a locally declared interface/type/class/enum', () => {
    const dts = `
      export interface User {}
      export type Config = {}
    `

    expect(hasTypeExport(dts, 'User')).toBe(true)
    expect(hasTypeExport(dts, 'Config')).toBe(true)
  })

  it('matches a re-exported type in bundled .d.ts output', () => {
    // Regression test: bundled .d.ts output re-exports rather than inlining
    // types, e.g. `export type { TokenMode } from './types/token-mode';` —
    // a regex looking only for `type TokenMode` would never match this.
    const dts = `export type { TokenMode } from './types/token-mode';`

    expect(hasTypeExport(dts, 'TokenMode')).toBe(true)
  })

  it('does not false-positive on a name that only appears as a substring', () => {
    const dts = `export type { TokenModeEnum } from './enums/token-mode';`

    expect(hasTypeExport(dts, 'TokenMode')).toBe(false)
  })

  it('returns false when the name is genuinely absent', () => {
    const dts = `export interface User {}`

    expect(hasTypeExport(dts, 'Missing')).toBe(false)
  })
})

describe('isExported', () => {
  it('returns false for nodes without modifiers', () => {
    const source = `
      const value = 1
    `

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual([])
  })

  it('ignores exported variables that are not identifiers', () => {
    const source = `
    export const { value } = { value: 1 }
  `

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual([])
  })

  it('ignores export declarations without named exports', () => {
    const source = `
    export * from './module'
  `

    const result = extractExportsFromText(source)

    expect(result.runtime).toEqual([])
    expect(result.types).toEqual([])
  })

  it('handles type-only export declarations', () => {
    const source = `
    export type { User } from './user'
  `

    const result = extractExportsFromText(source)

    expect(result.types).toContain('User')
  })

  it('handles type-only named export elements', () => {
    const source = `
    export { type User } from './user'
  `

    const result = extractExportsFromText(source)

    expect(result.types).toContain('User')
  })

  it('does not treat export equals as default export', () => {
    const source = `
    const value = {}
    export = value
  `

    const result = extractExportsFromText(source)

    expect(result.runtime).not.toContain('default')
  })

  it('matches normal re-export without type keyword', () => {
    const dts = `
    export { User } from './user'
  `

    expect(hasTypeExport(dts, 'User')).toBe(true)
  })

  it('returns empty exports when source entry is missing', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    const result = extractExportsFromSource('/fake-package')

    expect(result).toEqual({
      runtime: [],
      types: []
    })
  })
})
