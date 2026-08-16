import { exec as defaultExec, spawn as defaultSpawn } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(defaultExec)

export interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  signal?: AbortSignal
}

export interface SpawnedProcess {
  pid?: number | undefined
  on(event: 'error', listener: (error: Error) => void): this
  on(event: 'close', listener: (code: number | null) => void): this
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: {
    cwd?: string
    env?: NodeJS.ProcessEnv
    stdio: 'inherit'
    detached?: boolean
  }
) => SpawnedProcess

export type KillFn = (pid: number) => Promise<void>

// Distinguishes "the process was killed because something else already
// failed" from a genuine non-zero exit — callers (full-check's scheduler)
// need this to avoid reporting a cancelled-but-otherwise-fine step as if it
// were the actual failure.
export class CommandCancelledError extends Error {}

export function resolveCommand(
  command: string,
  platform: NodeJS.Platform = process.platform
): {
  command: string
  argsPrefix: string[]
} {
  if (platform === 'win32' && command === 'pnpm') {
    return {
      command: 'cmd.exe',
      argsPrefix: ['/d', '/s', '/c', 'pnpm']
    }
  }

  return {
    command,
    argsPrefix: []
  }
}

// A plain `child.kill()` only signals the immediate process — on Windows
// specifically, that's `cmd.exe` (see resolveCommand), not the real pnpm/
// node process it launches, and cmd.exe doesn't reliably forward the signal
// to its own children. `taskkill /T` kills the whole descendant tree by
// PID regardless of how deep it goes; `/F` forces it instead of waiting on
// a graceful shutdown a build/test process may never honor promptly. Even
// this isn't airtight — `taskkill /T` walks a one-time snapshot of the
// tree, so a grandchild spawned in the exact window between that walk and
// the actual kill can survive as an orphan (confirmed directly against a
// real Stryker run: 15 worker processes kept running for minutes after
// `pnpm run full-check` itself had already reported the step cancelled and
// exited) — the real fix for that is not spawning an unmonitored child in
// the first place (see full-check.ts's Mutation Testing step), not
// anything killProcessTree itself can guarantee after the fact.
//
// POSIX targets `-pid` (the negative form), signaling the whole process
// *group* rather than just the one PID — this requires the child to have
// been spawned with `detached: true` (see runCommand below), which on
// POSIX makes it the leader of its own new group that every process it
// goes on to spawn inherits automatically. That's an OS-level guarantee
// tracked continuously as processes are created, not a snapshot walk, so
// it doesn't have the same race as `taskkill /T` — a grandchild spawned a
// moment after the signal was sent is still in the group and still dies
// with it. A plain SIGTERM on just the immediate PID (the old behavior
// here) only reached deeper descendants if every intermediate process
// happened to forward it, which build/test tooling doesn't reliably do.
export async function killProcessTree(
  pid: number,
  platform: NodeJS.Platform = process.platform,
  exec: typeof execAsync = execAsync
): Promise<void> {
  if (platform === 'win32') {
    await exec(`taskkill /pid ${String(pid)} /T /F`).catch(() => {
      // Already exited on its own — not worth surfacing.
    })
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    // Already exited on its own, or was never actually its own group
    // leader (e.g. a directly-injected test double) — not worth surfacing.
  }
}

// Wrapping in a plain arrow function with `SpawnFn`'s exact shape, rather
// than assigning `defaultSpawn` (Node's real, heavily overloaded `spawn`)
// directly as the default parameter value, sidesteps a TypeScript overload
// resolution quirk — checking a multi-overload function against a single
// target signature can pick the wrong overload to compare and report a
// spurious mismatch, even though a real call always resolves correctly.
const spawnProcess: SpawnFn = (command, args, options) => defaultSpawn(command, args, options)

export function runCommand(
  command: string,
  args: string[] = [],
  options: RunCommandOptions = {},
  spawn: SpawnFn = spawnProcess,
  kill: KillFn = (pid) => killProcessTree(pid),
  platform: NodeJS.Platform = process.platform
): Promise<void> {
  return new Promise((resolve, reject) => {
    const resolved = resolveCommand(command)

    const child = spawn(resolved.command, [...resolved.argsPrefix, ...args], {
      ...(options.cwd ? { cwd: path.resolve(options.cwd) } : {}),
      env: {
        ...process.env,
        ...options.env
      },
      stdio: 'inherit',
      // Makes the child the leader of its own new process group on POSIX,
      // so killProcessTree can later signal the whole group at once — see
      // its own comment for why. Windows has no equivalent concept here
      // (taskkill /T works by PID ancestry instead) and `detached` would
      // change how a console-attached, stdio:'inherit' child behaves there,
      // so this is POSIX-only.
      ...(platform === 'win32' ? {} : { detached: true })
    })

    let aborted = false

    const onAbort = (): void => {
      aborted = true
      if (child.pid) void kill(child.pid)
    }

    if (options.signal) {
      if (options.signal.aborted) {
        onAbort()
      } else {
        options.signal.addEventListener('abort', onAbort, { once: true })
      }
    }

    child.on('error', (error) => {
      options.signal?.removeEventListener('abort', onAbort)
      reject(error)
    })

    child.on('close', (code) => {
      options.signal?.removeEventListener('abort', onAbort)

      if (aborted) {
        reject(new CommandCancelledError(`Command cancelled: ${command} ${args.join(' ')}`))
        return
      }

      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`))
    })
  })
}
