import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { discoverBenchmarkedPackages } from './discover-benchmarked-packages'

let tempDir: string | undefined

function createTempWorkspace(): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discover-benchmarked-packages-test-'))

  return tempDir
}

function createPackage(directory: string, name: string, withBench: boolean): void {
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name }))

  if (withBench) {
    fs.mkdirSync(path.join(directory, 'bench'), { recursive: true })
  }
}

describe(discoverBenchmarkedPackages, () => {
  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  it('finds only packages with a bench/ directory, sorted by name', () => {
    const workspace = createTempWorkspace()

    createPackage(path.join(workspace, 'fetch'), '@codeminity/fetch', true)
    createPackage(path.join(workspace, 'axios'), '@codeminity/axios', true)
    createPackage(path.join(workspace, 'ui-kit'), '@codeminity/ui-kit', false)

    expect(discoverBenchmarkedPackages(workspace)).toStrictEqual([
      {
        name: '@codeminity/axios',
        dir: path.join(workspace, 'axios'),
        benchDir: path.join(workspace, 'axios', 'bench')
      },
      {
        name: '@codeminity/fetch',
        dir: path.join(workspace, 'fetch'),
        benchDir: path.join(workspace, 'fetch', 'bench')
      }
    ])
  })

  it('returns an empty array when no package has a bench/ directory', () => {
    const workspace = createTempWorkspace()

    createPackage(path.join(workspace, 'ui-kit'), '@codeminity/ui-kit', false)

    expect(discoverBenchmarkedPackages(workspace)).toStrictEqual([])
  })
})
