import { runCommand } from './run-command'

export async function runPublint(packagePath: string): Promise<void> {
  await runCommand('pnpm', ['exec', 'publint', packagePath])
}
