import { EventEmitter } from 'node:events'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { resolveCommand, runCommand, type SpawnedProcess } from './run-command'

function createChild(): SpawnedProcess & EventEmitter {
  return new EventEmitter() as SpawnedProcess & EventEmitter
}

function createSpawnMock(child: SpawnedProcess) {
  return vi.fn<
    (
      command: string,
      args: string[],
      options: {
        cwd?: string
        env?: NodeJS.ProcessEnv
        stdio: 'inherit'
      }
    ) => SpawnedProcess
  >(() => child)
}

describe('resolveCommand', () => {
  it('keeps non-windows commands unchanged', () => {
    expect(resolveCommand('node')).toEqual({
      command: 'node',
      argsPrefix: []
    })
  })

  it('resolves pnpm for Windows', () => {
    expect(resolveCommand('pnpm', 'win32')).toEqual({
      command: 'cmd.exe',
      argsPrefix: ['/d', '/s', '/c', 'pnpm']
    })
  })

  it('resolves pnpm for Linux/macOS', () => {
    expect(resolveCommand('pnpm', 'linux')).toEqual({
      command: 'pnpm',
      argsPrefix: []
    })

    expect(resolveCommand('pnpm', 'darwin')).toEqual({
      command: 'pnpm',
      argsPrefix: []
    })
  })
})

describe('runCommand', () => {
  it('resolves when command exits successfully', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('node', ['build'], {}, spawn)

    child.emit('close', 0)

    await expect(promise).resolves.toBeUndefined()

    expect(spawn).toHaveBeenCalledWith(
      'node',
      ['build'],
      expect.objectContaining({
        stdio: 'inherit'
      })
    )
  })

  it('rejects when command exits with non-zero code', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('pnpm', ['build'], {}, spawn)

    child.emit('close', 1)

    await expect(promise).rejects.toThrow('Command failed: pnpm build')
  })

  it('rejects when command exits with null code', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('pnpm', ['build'], {}, spawn)

    child.emit('close', null)

    await expect(promise).rejects.toThrow('Command failed: pnpm build')
  })

  it('rejects when spawn emits error', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('pnpm', ['build'], {}, spawn)

    child.emit('error', new Error('spawn failed'))

    await expect(promise).rejects.toThrow('spawn failed')
  })

  it('omits cwd entirely when not provided', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('node', ['build'], {}, spawn)

    child.emit('close', 0)

    await promise

    const call = spawn.mock.calls.at(0)

    expect(call).toBeDefined()

    if (!call) {
      return
    }

    expect('cwd' in call[2]).toBe(false)
  })

  it('passes cwd and env options', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand(
      'node',
      ['build'],
      {
        cwd: '/tmp/project',
        env: {
          TEST: 'true'
        }
      },
      spawn
    )

    child.emit('close', 0)

    await promise

    const call = spawn.mock.calls.at(0)

    expect(call).toBeDefined()

    if (!call) {
      return
    }

    const options = call[2]

    expect(options.cwd).toBe(path.resolve('/tmp/project'))
    expect(options.stdio).toBe('inherit')
    expect(options.env?.TEST).toBe('true')
  })

  it('uses platform-specific pnpm command resolution', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('pnpm', ['build'], {}, spawn)

    child.emit('close', 0)

    await promise

    if (process.platform === 'win32') {
      expect(spawn).toHaveBeenCalledWith(
        'cmd.exe',
        ['/d', '/s', '/c', 'pnpm', 'build'],
        expect.any(Object)
      )

      return
    }

    expect(spawn).toHaveBeenCalledWith('pnpm', ['build'], expect.any(Object))
  })
})
