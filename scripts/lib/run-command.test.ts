import { EventEmitter } from 'node:events'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  CommandCancelledError,
  killProcessTree,
  resolveCommand,
  runCommand,
  type SpawnedProcess
} from './run-command'

function required<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message)
  return value
}

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
        detached?: boolean
      }
    ) => SpawnedProcess
  >(() => child)
}

describe('resolveCommand', () => {
  it('keeps non-windows commands unchanged', () => {
    expect(resolveCommand('node')).toStrictEqual({
      command: 'node',
      argsPrefix: []
    })
  })

  it('resolves pnpm for Windows', () => {
    expect(resolveCommand('pnpm', 'win32')).toStrictEqual({
      command: 'cmd.exe',
      argsPrefix: ['/d', '/s', '/c', 'pnpm']
    })
  })

  it('resolves pnpm for Linux/macOS', () => {
    expect(resolveCommand('pnpm', 'linux')).toStrictEqual({
      command: 'pnpm',
      argsPrefix: []
    })

    expect(resolveCommand('pnpm', 'darwin')).toStrictEqual({
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

    const call = required(spawn.mock.calls.at(0), 'expected spawn to have been called')

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

    const call = required(spawn.mock.calls.at(0), 'expected spawn to have been called')

    const options = call[2]

    expect(options.cwd).toBe(path.resolve('/tmp/project'))
    expect(options.stdio).toBe('inherit')
    expect(options.env?.TEST).toBe('true')
  })

  it('uses cmd.exe pnpm command resolution on win32', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('pnpm', ['build'], {}, spawn, undefined, 'win32')

    child.emit('close', 0)

    await promise

    expect(spawn).toHaveBeenCalledWith(
      'cmd.exe',
      ['/d', '/s', '/c', 'pnpm', 'build'],
      expect.any(Object)
    )
  })

  it('uses direct pnpm command resolution on non-Windows platforms', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('pnpm', ['build'], {}, spawn, undefined, 'linux')

    child.emit('close', 0)

    await promise

    expect(spawn).toHaveBeenCalledWith('pnpm', ['build'], expect.any(Object))
  })

  it('spawns detached on posix (so killProcessTree can target the whole process group)', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('node', ['build'], {}, spawn, undefined, 'linux')

    child.emit('close', 0)

    await promise

    const call = spawn.mock.calls.at(0)
    expect(call).toBeDefined()
    expect(call?.[2].detached).toBe(true)
  })

  it('does not spawn detached on win32 (taskkill /T works by PID ancestry instead)', async () => {
    const child = createChild()

    const spawn = createSpawnMock(child)

    const promise = runCommand('node', ['build'], {}, spawn, undefined, 'win32')

    child.emit('close', 0)

    await promise

    const call = spawn.mock.calls.at(0)
    expect(call).toBeDefined()
    expect(call?.[2].detached).toBeUndefined()
  })

  it('kills the process and rejects with CommandCancelledError when the signal aborts mid-run', async () => {
    const child = createChild()
    child.pid = 4242

    const spawn = createSpawnMock(child)
    const kill = vi.fn<(pid: number) => Promise<void>>().mockResolvedValue(undefined)
    const controller = new AbortController()

    const promise = runCommand('pnpm', ['run', 'slow'], { signal: controller.signal }, spawn, kill)

    controller.abort()

    // Real cancellation is a race: the kill signal is sent, but the process
    // only actually reports closed once the OS has finished tearing it
    // down — runCommand must wait for that `close` event before settling,
    // not resolve as soon as kill() is called.
    expect(kill).toHaveBeenCalledWith(4242)
    await Promise.resolve()

    child.emit('close', null)

    await expect(promise).rejects.toThrow(CommandCancelledError)
    await expect(promise).rejects.toThrow('Command cancelled: pnpm run slow')
  })

  it('kills immediately when the signal is already aborted before the process even starts', async () => {
    const child = createChild()
    child.pid = 99

    const spawn = createSpawnMock(child)
    const kill = vi.fn<(pid: number) => Promise<void>>().mockResolvedValue(undefined)
    const controller = new AbortController()
    controller.abort()

    const promise = runCommand('pnpm', ['run', 'slow'], { signal: controller.signal }, spawn, kill)

    expect(kill).toHaveBeenCalledWith(99)

    child.emit('close', null)

    await expect(promise).rejects.toThrow(CommandCancelledError)
  })

  it('does not attempt to kill when the child never reported a pid', async () => {
    const child = createChild()
    // No pid assigned — mirrors a process that failed to spawn at all.

    const spawn = createSpawnMock(child)
    const kill = vi.fn<(pid: number) => Promise<void>>().mockResolvedValue(undefined)
    const controller = new AbortController()

    const promise = runCommand('pnpm', ['run', 'slow'], { signal: controller.signal }, spawn, kill)

    controller.abort()
    child.emit('close', null)

    await expect(promise).rejects.toThrow(CommandCancelledError)
    expect(kill).not.toHaveBeenCalled()
  })

  it('falls back to the real killProcessTree when no kill function is injected', async () => {
    const child = createChild()
    // A pid vanishingly unlikely to correspond to a real running process —
    // killProcessTree's own "already exited" catch handles this the same
    // as a genuine race against a process that just finished on its own.
    child.pid = 999999

    const spawn = createSpawnMock(child)
    const controller = new AbortController()

    // No `kill` argument — exercises the real default (`killProcessTree`),
    // not an injected mock.
    const promise = runCommand('pnpm', ['run', 'slow'], { signal: controller.signal }, spawn)

    controller.abort()
    child.emit('close', null)

    await expect(promise).rejects.toThrow(CommandCancelledError)
  })

  it('still resolves normally on a clean exit even when a signal was provided but never aborted', async () => {
    const child = createChild()
    child.pid = 7

    const spawn = createSpawnMock(child)
    const kill = vi.fn<(pid: number) => Promise<void>>().mockResolvedValue(undefined)
    const controller = new AbortController()

    const promise = runCommand('pnpm', ['run', 'fast'], { signal: controller.signal }, spawn, kill)

    child.emit('close', 0)

    await expect(promise).resolves.toBeUndefined()
    expect(kill).not.toHaveBeenCalled()
  })

  it('uses the real spawn (node child_process) when no spawn function is injected', async () => {
    // No `spawn` argument — exercises the real default, not a mock. `node
    // -e process.exit(0)` is a fast, side-effect-free real subprocess.
    await expect(runCommand('node', ['-e', 'process.exit(0)'])).resolves.toBeUndefined()
  })
})

describe('CommandCancelledError', () => {
  it('is a real Error subclass carrying the given message', () => {
    const error = new CommandCancelledError('cancelled: pnpm build')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('cancelled: pnpm build')
  })
})

describe('killProcessTree', () => {
  it('runs taskkill against the whole process tree on win32', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' })

    await killProcessTree(1234, 'win32', exec as never)

    expect(exec).toHaveBeenCalledWith('taskkill /pid 1234 /T /F')
  })

  it('swallows a taskkill failure (process already gone) on win32', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('not found'))

    await expect(killProcessTree(1234, 'win32', exec as never)).resolves.toBeUndefined()
  })

  it('sends SIGTERM to the whole process group (negative pid) on posix platforms', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

    try {
      await killProcessTree(5678, 'linux')
      // The negative form targets every process in pid 5678's group, not
      // just that one process — see this function's own comment on why a
      // plain positive-pid SIGTERM isn't enough to reach a real tree.
      expect(killSpy).toHaveBeenCalledWith(-5678, 'SIGTERM')
    } finally {
      killSpy.mockRestore()
    }
  })

  it('swallows a SIGTERM failure (process already gone) on posix platforms', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH')
    })

    try {
      await expect(killProcessTree(5678, 'darwin')).resolves.toBeUndefined()
    } finally {
      killSpy.mockRestore()
    }
  })
})
