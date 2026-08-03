import { runCommand } from './lib/run-command'

export interface CheckStep {
  name: string
  args: string[]
}

// Mirrors ci.yml's "Test / Build / Lint" job order exactly (build, then
// lint, then typecheck, then test), plus the slow checks (mutation, e2e)
// that only run manually / via separate jobs there.
export const CHECK_STEPS: CheckStep[] = [
  { name: 'Build', args: ['run', 'build'] },
  { name: 'Lint', args: ['run', 'lint'] },
  { name: 'Format Validation', args: ['run', 'validate:format'] },
  { name: 'Typecheck', args: ['run', 'typecheck'] },
  { name: 'Test (coverage)', args: ['run', 'test:coverage'] },
  { name: 'Dependency Architecture', args: ['run', 'validate:deps'] },
  { name: 'API Validation', args: ['run', 'validate:api'] },
  { name: 'Document Validation', args: ['run', 'validate:docs'] },
  { name: 'Verify Packages', args: ['run', 'verify:packages'] },
  { name: 'Bundle Size', args: ['run', 'validate:size'] },
  { name: 'Mutation Testing', args: ['run', 'test:mutation'] },
  { name: 'Browser E2E', args: ['run', 'test:e2e'] }
]

export interface CheckStepResult {
  name: string
  passed: boolean
  durationMs: number
}

export interface RunFullCheckOptions {
  onStepStart?: (step: CheckStep) => void
  onStepComplete?: (result: CheckStepResult) => void
}

export async function runFullCheck(
  steps: CheckStep[] = CHECK_STEPS,
  options: RunFullCheckOptions = {}
): Promise<CheckStepResult[]> {
  const results: CheckStepResult[] = []

  for (const step of steps) {
    options.onStepStart?.(step)

    const start = Date.now()
    const passed = await runCommand('pnpm', step.args)
      .then(() => true)
      .catch(() => false)

    const result: CheckStepResult = { name: step.name, passed, durationMs: Date.now() - start }
    results.push(result)
    options.onStepComplete?.(result)
  }

  return results
}

export function hasFailures(results: CheckStepResult[]): boolean {
  return results.some((result) => !result.passed)
}
