import { describe, expect, it, vi } from 'vitest'

import { runApiExtractor } from './run-api-extractor'
import { runCommand } from './run-command'

vi.mock('./run-command', () => ({
  runCommand: vi.fn()
}))

const mockedRunCommand = vi.mocked(runCommand)

describe('runApiExtractor', () => {
  it('runs api-extractor', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(runApiExtractor('packages/request/core')).resolves.toBeUndefined()

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'api-extractor', 'run', '--local'],
      {
        cwd: 'packages/request/core'
      }
    )
  })

  it('propagates failures', async () => {
    mockedRunCommand.mockRejectedValue(new Error('api-extractor failed'))

    await expect(runApiExtractor('packages/request/core')).rejects.toThrow('api-extractor failed')
  })
})
