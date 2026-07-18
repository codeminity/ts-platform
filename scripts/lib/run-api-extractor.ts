import { runCommand } from './run-command'

export async function runApiExtractor(packagePath: string): Promise<void> {
  await runCommand('pnpm', ['exec', 'api-extractor', 'run', '--local'], {
    cwd: packagePath
  })
}
