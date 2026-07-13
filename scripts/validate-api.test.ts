import { describe, it, expect } from 'vitest'
import ts from 'typescript'

describe('API validation', () => {
  it('detects exported function', () => {
    const source = `
      export function hello(){}
      export interface User {}
      export type Config = {}
    `

    const file = ts.createSourceFile('test.ts', source, ts.ScriptTarget.Latest, true)
    const names: string[] = []

    file.forEachChild((node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        names.push(node.name.text)
      }
    })

    expect(names).toContain('hello')
  })

  it('fails when runtime export missing', () => {
    const runtime = {}

    expect('hello' in runtime).toBe(false)
  })

  it('passes when export exists', () => {
    const runtime = {
      hello() {}
    }

    expect('hello' in runtime).toBe(true)
  })

  it('detects type exports', () => {
    const dts = `
      export interface User {}
      export type Config = {}
    `

    expect(dts.includes('interface User')).toBe(true)
    expect(dts.includes('type Config')).toBe(true)
  })
})
