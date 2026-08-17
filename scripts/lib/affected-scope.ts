import { exec as defaultExec } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import { findWorkspacePackages } from '../package-discovery'

import { readPackageJson } from './read-package-json'

const execAsync = promisify(defaultExec)

export type ExecFn = (command: string) => Promise<{ stdout: string }>

interface TurboDryRun {
  packages: string[]
}

// `full` means "don't scope — run the whole check". This is the safe
// default whenever a change could plausibly affect something Turborepo's
// own package graph doesn't track at all: root config (tsconfig.base.json,
// eslint.config.ts, turbo.json, root package.json, ...) or this repo's own
// scripts/ tooling, neither of which is a workspace member turbo has any
// notion of "depends on this". Getting this wrong in the other direction —
// scoping when it should have been full — is exactly the silent-wrong-pass
// failure mode this repo has consistently refused to trade speed for; a
// `full` result is over-cautious at worst, never unsafe.
export type AffectedScope =
  { type: 'full' } | { type: 'scoped'; packageDirs: string[]; appDirs: string[] }

// Exported so relevant-changes.ts (glob-based step skipping) can reuse the
// exact same git-diff-plus-untracked-files logic instead of a second,
// slightly-different implementation.
export async function getChangedFiles(baseRef: string, exec: ExecFn): Promise<string[]> {
  const [diffResult, untrackedResult] = await Promise.all([
    exec(`git diff --name-only ${baseRef}`),
    exec('git ls-files --others --exclude-standard')
  ])

  return [
    ...new Set(
      [...diffResult.stdout.split('\n'), ...untrackedResult.stdout.split('\n')]
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
  ]
}

function affectedDirsUnder(rootDir: string, affectedNames: Set<string>): string[] {
  return findWorkspacePackages(rootDir)
    .filter((packagePath) => affectedNames.has(readPackageJson(packagePath).name))
    .map((packagePath) => packagePath.split(path.sep).join('/'))
}

async function computeAffectedScope(
  baseRef: string,
  exec: ExecFn,
  packagesDir: string,
  appsDir: string
): Promise<AffectedScope> {
  const changedFiles = await getChangedFiles(baseRef, exec)

  const hasChangeOutsideWorkspace = changedFiles.some(
    (file) => !file.startsWith('packages/') && !file.startsWith('apps/')
  )

  if (hasChangeOutsideWorkspace) {
    return { type: 'full' }
  }

  if (changedFiles.length === 0) {
    return { type: 'scoped', packageDirs: [], appDirs: [] }
  }

  const { stdout } = await exec(`pnpm exec turbo run build --filter="...[${baseRef}]" --dry=json`)

  const dryRun = JSON.parse(stdout) as TurboDryRun
  const affectedNames = new Set(dryRun.packages.filter((name) => name !== '//'))

  if (affectedNames.size === 0) {
    return { type: 'scoped', packageDirs: [], appDirs: [] }
  }

  return {
    type: 'scoped',
    packageDirs: affectedDirsUnder(packagesDir, affectedNames),
    appDirs: affectedDirsUnder(appsDir, affectedNames)
  }
}

// Covers both packages/ and apps/, and falls all the way back to `full`
// rather than silently scoping to an empty (or wrong) set when a change
// lands somewhere Turborepo's dependency graph has no visibility into at
// all. (An earlier, packages/-only sibling of this function, used for
// mutation testing's own local scoping, existed briefly — removed in
// DECISIONS.md ADR-017 once mutation testing itself moved off local
// scoping entirely.)
//
// Also falls back to `full` on *any* unexpected failure — most notably,
// `git diff --name-only origin/main` genuinely fails in CI: `actions/
// checkout` defaults to a shallow, single-ref clone, so `origin/main` isn't
// necessarily a resolvable ref at all there. Rather than have every caller
// of this function separately guess whether that's the situation it's in,
// scoping itself degrades to "can't tell, so don't skip anything" — the
// same posture as every other case this function already treats as `full`.
export async function getAffectedScope(
  baseRef = 'origin/main',
  exec: ExecFn = execAsync,
  packagesDir = 'packages',
  appsDir = 'apps'
): Promise<AffectedScope> {
  try {
    return await computeAffectedScope(baseRef, exec, packagesDir, appsDir)
  } catch (error) {
    console.warn(
      `Could not determine affected scope (${error instanceof Error ? error.message : String(error)}) — running unscoped.`
    )
    return { type: 'full' }
  }
}
