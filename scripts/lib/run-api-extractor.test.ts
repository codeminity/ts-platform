import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runApiExtractor } from './run-api-extractor'
import { runCommand } from './run-command'

vi.mock(import('./run-command'), () => ({
  runCommand: vi.fn<typeof runCommand>()
}))

const mockedRunCommand = vi.mocked(runCommand)

let tempDir: string | undefined

function createTempPackage(configNames: string[]) {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-api-extractor-test-'))

  for (const name of configNames) {
    fs.writeFileSync(path.join(tempDir, name), '{}')
  }

  return tempDir
}

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    tempDir = undefined
  }
})

describe('runApiExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs api-extractor once for a single-entry package', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    const packagePath = createTempPackage(['api-extractor.json'])

    await expect(runApiExtractor(packagePath)).resolves.toBeUndefined()

    expect(mockedRunCommand).toHaveBeenCalledTimes(1)
    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'api-extractor', 'run', '--config', path.join(packagePath, 'api-extractor.json')],
      { cwd: packagePath }
    )
  })

  it('runs api-extractor once per config for a multi-entry package', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    const packagePath = createTempPackage(['api-extractor.json', 'api-extractor.vue.json'])

    await runApiExtractor(packagePath)

    expect(mockedRunCommand).toHaveBeenCalledTimes(2)
    expect(mockedRunCommand).toHaveBeenNthCalledWith(
      1,
      'pnpm',
      ['exec', 'api-extractor', 'run', '--config', path.join(packagePath, 'api-extractor.json')],
      { cwd: packagePath }
    )
    expect(mockedRunCommand).toHaveBeenNthCalledWith(
      2,
      'pnpm',
      [
        'exec',
        'api-extractor',
        'run',
        '--config',
        path.join(packagePath, 'api-extractor.vue.json')
      ],
      { cwd: packagePath }
    )
  })

  it('propagates failures', async () => {
    mockedRunCommand.mockRejectedValue(new Error('api-extractor failed'))

    const packagePath = createTempPackage(['api-extractor.json'])

    await expect(runApiExtractor(packagePath)).rejects.toThrow('api-extractor failed')
  })
})
