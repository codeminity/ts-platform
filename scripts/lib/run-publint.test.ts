import { describe, expect, it, vi } from 'vitest'

import { runCommand } from './run-command'
import { runPublint } from './run-publint'

vi.mock('./run-command', () => ({
  runCommand: vi.fn()
}))

const mockedRunCommand = vi.mocked(runCommand)

describe('runPublint', () => {
  it('runs publint with package path', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(runPublint('packages/request/core')).resolves.toBeUndefined()

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', [
      'exec',
      'publint',
      'packages/request/core'
    ])
  })

  it('propagates publint failure', async () => {
    mockedRunCommand.mockRejectedValue(new Error('publint failed'))

    await expect(runPublint('packages/request/core')).rejects.toThrow('publint failed')
  })
})
