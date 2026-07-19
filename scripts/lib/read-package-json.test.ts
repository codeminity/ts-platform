import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readPackageJson } from './read-package-json'

let tempDir: string | undefined

function createPackageJson(content: unknown): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'read-package-json-test-'))

  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(content))

  return tempDir
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })

    tempDir = undefined
  }
})

describe('readPackageJson', () => {
  it('returns the package name', () => {
    const directory = createPackageJson({ name: '@codeminity/axios' })

    expect(readPackageJson(directory)).toEqual({ name: '@codeminity/axios' })
  })

  it('throws when package.json has no name', () => {
    const directory = createPackageJson({})

    expect(() => readPackageJson(directory)).toThrow('Invalid package.json')
  })

  it('throws when package.json name is not a string', () => {
    const directory = createPackageJson({ name: 123 })

    expect(() => readPackageJson(directory)).toThrow('Invalid package.json')
  })

  it('throws when package.json is not an object', () => {
    const directory = createPackageJson('not-an-object')

    expect(() => readPackageJson(directory)).toThrow('Invalid package.json')
  })

  it('throws when package.json is null', () => {
    const directory = createPackageJson(null)

    expect(() => readPackageJson(directory)).toThrow('Invalid package.json')
  })
})
