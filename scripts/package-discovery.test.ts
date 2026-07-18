import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findWorkspacePackages } from './package-discovery'

let tempDir: string | undefined

function createTempWorkspace() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'package-discovery-test-'))

  return tempDir
}

function createPackage(directory: string) {
  fs.mkdirSync(directory, {
    recursive: true
  })

  fs.writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({
      name: path.basename(directory)
    })
  )
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true
    })

    tempDir = undefined
  }
})

describe('findWorkspacePackages', () => {
  it('finds workspace packages recursively', () => {
    const workspace = createTempWorkspace()

    const core = path.join(workspace, 'request', 'core')

    const axios = path.join(workspace, 'request', 'axios')

    createPackage(core)
    createPackage(axios)

    expect(findWorkspacePackages(workspace)).toEqual([axios, core])
  })

  it('returns empty array when workspace directory does not exist', () => {
    expect(findWorkspacePackages(path.join(os.tmpdir(), 'missing-workspace'))).toEqual([])
  })

  it('does not scan nested directories after finding package.json', () => {
    const workspace = createTempWorkspace()

    const packageDir = path.join(workspace, 'request', 'core')

    createPackage(packageDir)

    createPackage(path.join(packageDir, 'nested'))

    expect(findWorkspacePackages(workspace)).toEqual([packageDir])
  })

  it('ignores directories without package.json', () => {
    const workspace = createTempWorkspace()

    fs.mkdirSync(path.join(workspace, 'docs'), {
      recursive: true
    })

    expect(findWorkspacePackages(workspace)).toEqual([])
  })

  it('ignores files inside workspace directories', () => {
    const workspace = createTempWorkspace()

    fs.mkdirSync(path.join(workspace, 'docs'), {
      recursive: true
    })

    fs.writeFileSync(path.join(workspace, 'README.md'), '')

    expect(findWorkspacePackages(workspace)).toEqual([])
  })
})
