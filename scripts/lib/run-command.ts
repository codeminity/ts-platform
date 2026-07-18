import { spawn as defaultSpawn } from 'node:child_process'
import path from 'node:path'

export interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
}

export interface SpawnedProcess {
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
  }
) => SpawnedProcess

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

export function runCommand(
  command: string,
  args: string[] = [],
  options: RunCommandOptions = {},
  spawn: SpawnFn = defaultSpawn
): Promise<void> {
  return new Promise((resolve, reject) => {
    const resolved = resolveCommand(command)

    const child = spawn(resolved.command, [...resolved.argsPrefix, ...args], {
      cwd: options.cwd ? path.resolve(options.cwd) : undefined,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: 'inherit'
    })

    child.on('error', reject)

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`))
    })
  })
}
