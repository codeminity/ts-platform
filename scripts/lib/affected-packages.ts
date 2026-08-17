import { exec as defaultExec } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import { findWorkspacePackages } from '../package-discovery'

import { getChangedFiles, type ExecFn } from './affected-scope'
import { readPackageJson } from './read-package-json'

const execAsync = promisify(defaultExec)

export type { ExecFn }

interface TurboDryRun {
  packages: string[]
}

// Mutation testing is deliberately packages/-only (ADR-007 — apps/ is never
// mutated). It's *also* deliberately not a thin wrapper around
// getAffectedScope, unlike the earlier design here: getAffectedScope's own
// "anything outside packages/apps means full" rule is right for Lint/
// Typecheck, which really can be affected by nearly any root config, but
// it's needlessly conservative for mutation testing specifically — a
// change to, say, scripts/validate-deps.ts or README.md has no mechanism
// by which it could change which mutants get killed, so treating it as
// "must mutate everything" wastes real time for no real safety gained.
// Mutation testing's actual runtime correctness only ever depends on the
// files stryker.config.ts's own configuration chain loads: itself,
// vitest.mutation.config.ts (which it points `vitest.configFile` at),
// vitest.config.ts (which vitest.mutation.config.ts spreads wholesale),
// vitest.setup.ts (wired in via vitest.config.ts's own setupFiles), and
// tsconfig.base.json (every package's tsconfig extends it, and esbuild/
// Vite's own TS transform reads compiler options like `target` /
// `useDefineForClassFields` from the nearest tsconfig even without being
// told to, which can change compiled runtime behavior a mutant's kill/
// survive outcome depends on).
const MUTATION_RELEVANT_ROOT_FILES = [
  'vitest.config.ts',
  'vitest.mutation.config.ts',
  'vitest.setup.ts',
  'stryker.config.ts',
  'tsconfig.base.json'
]

function affectedDirsUnder(rootDir: string, affectedNames: Set<string>): string[] {
  return findWorkspacePackages(rootDir)
    .filter((packagePath) => affectedNames.has(readPackageJson(packagePath).name))
    .map((packagePath) => packagePath.split(path.sep).join('/'))
}

async function computeAffectedPackageDirs(
  baseRef: string,
  packagesDir: string,
  exec: ExecFn
): Promise<string[] | 'full'> {
  const changedFiles = await getChangedFiles(baseRef, exec)

  if (changedFiles.some((file) => MUTATION_RELEVANT_ROOT_FILES.includes(file))) {
    return 'full'
  }

  if (changedFiles.length === 0) return []

  // Turborepo's own dependency graph, not a raw `git diff` — a package
  // whose own source is untouched but that *depends on* something which
  // changed is still included (turbo's task-hash inputs are transitive),
  // the same correctness guarantee already relied on for build/typecheck
  // caching. This is deliberately not Stryker's own `--incremental` mode:
  // see DECISIONS.md ADR-013 for why that was rejected.
  const { stdout } = await exec(`pnpm exec turbo run build --filter="...[${baseRef}]" --dry=json`)

  const dryRun = JSON.parse(stdout) as TurboDryRun
  const affectedNames = new Set(dryRun.packages.filter((name) => name !== '//'))

  if (affectedNames.size === 0) return []

  return affectedDirsUnder(packagesDir, affectedNames)
}

// `'full'` means either a mutation-relevant root file changed, or changed
// files couldn't be determined at all (e.g. CI's shallow clone means
// `origin/main` isn't a resolvable ref) — the safe response in both cases
// is to mutate everything, i.e. not pass a STRYKER_MUTATE_DIRS override at
// all, not to scope to an empty (and therefore skipped) set.
export async function getAffectedPackageDirs(
  baseRef = 'origin/main',
  packagesDir = 'packages',
  exec: ExecFn = execAsync
): Promise<string[] | 'full'> {
  try {
    return await computeAffectedPackageDirs(baseRef, packagesDir, exec)
  } catch (error) {
    console.warn(
      `Could not determine affected scope (${error instanceof Error ? error.message : String(error)}) — running unscoped.`
    )
    return 'full'
  }
}
