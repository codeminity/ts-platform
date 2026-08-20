import fs from 'node:fs'
import path from 'node:path'

import { runCommand } from '../lib/run-command'
import { stripTests } from '../lib/strip-tests'

import { findRedundantTests } from './find-redundant-tests'

import type { MutationReport, RedundantTestCandidate } from './find-redundant-tests'

const REPORT_PATH = 'reports/mutation/mutation.json'
// Written alongside mutation.json/mutation.html, inside the same directory
// the nightly workflow already uploads as an artifact — so a failure here
// is fully readable from the downloaded artifact, without needing to
// re-run anything locally to see what was found.
const OUTPUT_PATH = 'reports/mutation/redundant-tests.txt'

async function coveragePasses(): Promise<boolean> {
  try {
    await runCommand('pnpm', ['run', 'test:coverage'])
    return true
  } catch {
    return false
  }
}

interface VerifyResult {
  // Passed BOTH mutation-kill redundancy (already true, or this wouldn't
  // be a candidate) AND a real `pnpm run test:coverage` run with it
  // physically removed.
  coverageConfirmed: RedundantTestCandidate[]
  // Mutation testing found these redundant, but removing them (alone, or
  // together with the rest of their file's candidates) dropped real
  // coverage below 100% — Stryker's mutant granularity is coarser than
  // v8's branch coverage for constructs like `a ?? b`/ternaries, where
  // every test that runs the expression at all "covers" the mutant
  // regardless of which side of the fallback it actually exercises.
  coverageRequired: RedundantTestCandidate[]
  // Static analysis flagged these, but the AST stripper couldn't locate a
  // matching plain `it(...)`/`test(...)` statement to remove — almost
  // always because it's a row inside `it.each([...])`, which is
  // deliberately never auto-edited (removing one row without corrupting
  // the array literal needs real judgment). Never actually removed from
  // disk, so never coverage-checked either.
  unverifiable: RedundantTestCandidate[]
}

async function verifyWithCoverage(confirmed: RedundantTestCandidate[]): Promise<VerifyResult> {
  const byFile = new Map<string, RedundantTestCandidate[]>()

  for (const candidate of confirmed) {
    const existing = byFile.get(candidate.file)

    if (existing) {
      existing.push(candidate)
    } else {
      byFile.set(candidate.file, [candidate])
    }
  }

  const originals = new Map<string, string>()

  for (const file of byFile.keys()) originals.set(file, fs.readFileSync(file, 'utf8'))

  function restoreAll() {
    for (const [file, content] of originals) fs.writeFileSync(file, content)
  }

  function stripFiles(files: Iterable<string>): Map<string, Set<string>> {
    const actuallyRemoved = new Map<string, Set<string>>()

    for (const file of files) {
      const candidateNames = new Set((byFile.get(file) ?? []).map((c) => c.name))
      const original = originals.get(file) ?? ''
      const { source, removed } = stripTests(original, candidateNames)

      fs.writeFileSync(file, source)
      actuallyRemoved.set(file, new Set(removed))
    }

    return actuallyRemoved
  }

  try {
    const actuallyRemoved = stripFiles(byFile.keys())

    const unverifiable = confirmed.filter(
      (c) => !(actuallyRemoved.get(c.file) ?? new Set()).has(c.name)
    )
    const strippedCandidates = confirmed.filter((c) =>
      (actuallyRemoved.get(c.file) ?? new Set()).has(c.name)
    )

    console.log(
      `Verifying ${String(strippedCandidates.length)} candidate(s) against real coverage...`
    )

    if (await coveragePasses()) {
      return { coverageConfirmed: strippedCandidates, coverageRequired: [], unverifiable }
    }

    console.log('Batch removal dropped coverage — checking file by file to isolate which one(s)...')
    restoreAll()

    const coverageConfirmed: RedundantTestCandidate[] = []
    const coverageRequired: RedundantTestCandidate[] = []

    for (const file of byFile.keys()) {
      stripFiles([file])

      const passed = await coveragePasses()
      const fileCandidates = strippedCandidates.filter((c) => c.file === file)

      console.log(`  ${passed ? '✅' : '❌'} ${file}`)

      if (passed) {
        coverageConfirmed.push(...fileCandidates)
      } else {
        coverageRequired.push(...fileCandidates)
      }

      restoreAll()
    }

    return { coverageConfirmed, coverageRequired, unverifiable }
  } finally {
    restoreAll()
  }
}

function formatSection(title: string, candidates: RedundantTestCandidate[]): string[] {
  if (candidates.length === 0) return []

  const grouped = new Map<string, string[]>()

  for (const { file, name } of candidates) {
    const names = grouped.get(file)

    if (names) {
      names.push(name)
    } else {
      grouped.set(file, [name])
    }
  }

  const lines = [title, '']

  for (const [file, names] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(file)

    for (const name of names) lines.push(`  - ${name}`)

    lines.push('')
  }

  return lines
}

// Only `coverageConfirmed` and `unverifiable`/`noMutationSignal` (genuinely
// unresolved either way) are actionable findings. `coverageRequired` isn't
// reported at all, by design — those tests were checked against real
// coverage and PROVEN necessary; printing them every night as if they were
// a problem would just be recurring noise for something that's already
// correctly resolved (it stays, permanently, until the source code itself
// changes).
function formatReport(result: VerifyResult, noMutationSignal: RedundantTestCandidate[]): string {
  const total =
    result.coverageConfirmed.length + result.unverifiable.length + noMutationSignal.length

  if (total === 0) return '✅ No redundant tests found\n'

  const lines = [
    ...formatSection(
      `Confirmed redundant — ${String(result.coverageConfirmed.length)} test(s) verified safe to ` +
        'remove: neither mutation-kill coverage (checked against their own file only) nor a real ' +
        '`pnpm run test:coverage` run (with the test physically removed) needs them:',
      result.coverageConfirmed
    ),
    ...formatSection(
      `Could not verify — ${String(result.unverifiable.length)} test(s) flagged by static ` +
        'analysis, but not physically removable by this script (almost always a row inside ' +
        '`it.each([...])` — removing one row without corrupting the array needs a human, not a ' +
        'codemod). Review these manually:',
      result.unverifiable
    ),
    ...formatSection(
      `No mutation signal — ${String(noMutationSignal.length)} test(s) whose source file has no ` +
        'usable Stryker data (excluded from the mutate glob, or every mutant on it is a ' +
        'static/ignored one Stryker never tracked coverage for). Mutation testing genuinely ' +
        'cannot judge these; run `pnpm run test:coverage` after removing one to confirm it ' +
        "doesn't drop a threshold before actually removing it:",
      noMutationSignal
    )
  ]

  if (result.coverageConfirmed.length > 0) {
    lines.push(
      'Even a "confirmed" candidate is not an automatic verdict — a test with zero unique ' +
        'mutation-kill contribution can still be the only one documenting a real scenario ' +
        "(e.g. priority-ordering between two inputs) that current mutants don't happen to " +
        'model. Review each one before removing it.'
    )
  }

  if (result.coverageRequired.length > 0) {
    lines.push(
      `\n(${String(result.coverageRequired.length)} additional candidate(s) were checked against ` +
        'real coverage and found necessary — no action needed, not listed above.)'
    )
  }

  return lines.join('\n')
}

async function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error(
      `${REPORT_PATH} not found. Run mutation testing first: pnpm run test:mutation ` +
        '(stryker.config.ts already enables disableBail and the json reporter this needs).'
    )
    process.exit(1)
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as MutationReport
  const candidates = findRedundantTests(report)

  const confirmed = candidates.filter((c) => c.confidence === 'confirmed')
  const noMutationSignal = candidates.filter((c) => c.confidence === 'no-mutation-signal')

  const result = await verifyWithCoverage(confirmed)
  const output = formatReport(result, noMutationSignal)

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, output)

  console.log(`\n${output}`)
  console.log(`\nFull report written to ${OUTPUT_PATH}`)

  // `coverageRequired` never fails the job — those were checked against
  // real coverage and proven necessary, not a problem to act on.
  const actionable =
    result.coverageConfirmed.length + result.unverifiable.length + noMutationSignal.length

  if (actionable > 0) process.exit(1)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
