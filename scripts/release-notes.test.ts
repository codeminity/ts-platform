import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { buildReleaseNotes, getReleaseNotes, parseReleaseTag } from './release-notes'

let tempDir: string | undefined

function createTempWorkspace() {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-notes-test-'))

  return tempDir
}

function createPackage(directory: string, name: string, changelog: string) {
  fs.mkdirSync(directory, { recursive: true })

  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name }))
  fs.writeFileSync(path.join(directory, 'CHANGELOG.md'), changelog)
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })

    tempDir = undefined
  }
})

describe('parseReleaseTag', () => {
  it('splits a scoped package tag on the last "@"', () => {
    expect(parseReleaseTag('@codeminity/axios@0.7.1')).toEqual({
      name: '@codeminity/axios',
      version: '0.7.1'
    })
  })
})

describe('getReleaseNotes', () => {
  it('returns the CHANGELOG.md section for the tagged version, skipping non-matching packages', () => {
    const workspace = createTempWorkspace()

    // Sorted before "fetch" below, so the loop must skip a non-matching
    // entry before reaching the one that matches.
    createPackage(
      path.join(workspace, 'a-unrelated'),
      '@codeminity/unrelated',
      '# @codeminity/unrelated\n\n## 1.0.0\n\n### Fixes\n\n- Unrelated fix\n'
    )
    createPackage(
      path.join(workspace, 'fetch'),
      '@codeminity/fetch',
      '# @codeminity/fetch\n\n## 0.1.1\n\n### Fixes\n\n- Fix thing\n'
    )

    expect(getReleaseNotes('@codeminity/fetch@0.1.1', workspace)).toBe('### Fixes\n\n- Fix thing')
  })

  it('throws when no workspace package matches the tag name', () => {
    const workspace = createTempWorkspace()

    expect(() => getReleaseNotes('@codeminity/missing@1.0.0', workspace)).toThrow(
      'Could not find a workspace package named "@codeminity/missing"'
    )
  })

  it('throws when the CHANGELOG.md has no section for the tagged version', () => {
    const workspace = createTempWorkspace()

    createPackage(
      path.join(workspace, 'axios'),
      '@codeminity/axios',
      '# @codeminity/axios\n\n## 0.7.0\n\n### Fixes\n\n- Fix thing\n'
    )

    expect(() => getReleaseNotes('@codeminity/axios@0.7.1', workspace)).toThrow(
      'No CHANGELOG.md section for version "0.7.1"'
    )
  })
})

describe('buildReleaseNotes', () => {
  it('appends an install section (one command per code block) and an npm link after the changelog section', () => {
    const workspace = createTempWorkspace()

    createPackage(
      path.join(workspace, 'axios'),
      '@codeminity/axios',
      '# @codeminity/axios\n\n## 0.7.1\n\n### Fixes\n\n- Fix thing\n'
    )

    const notes = buildReleaseNotes('@codeminity/axios@0.7.1', workspace)

    const installBlock = [
      '## Install',
      '```bash\npnpm add @codeminity/axios@0.7.1\n```',
      '```bash\nnpm install @codeminity/axios@0.7.1\n```',
      '```bash\nyarn add @codeminity/axios@0.7.1\n```',
      '📦 [@codeminity/axios@0.7.1 on npm](https://www.npmjs.com/package/@codeminity/axios/v/0.7.1)'
    ].join('\n\n')

    expect(notes).toBe(['### Fixes\n\n- Fix thing', '---', installBlock].join('\n\n'))
  })
})
