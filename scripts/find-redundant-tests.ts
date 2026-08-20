import path from 'node:path'

// Minimal shape of Stryker's JSON reporter output (mutation-testing-report-schema)
// covering only the fields this script reads.
export interface MutationReport {
  files: Record<string, { mutants: MutantResult[] }>
  testFiles?: Record<string, { tests: { id: string; name: string }[] }>
}

interface MutantResult {
  status: string
  killedBy?: string[]
  coveredBy?: string[]
}

export interface RedundantTestCandidate {
  file: string
  name: string
  // 'confirmed': removing it doesn't cost mutation-kill coverage (checked
  // against same-file tests only) NOR real statement coverage (checked
  // against every test, any file — coverage doesn't care about
  // architecture, only the mutation-redundancy question does).
  // 'no-mutation-signal': its source file has no usable Stryker data at
  // all (excluded from the mutate glob, e.g. test-utils.ts, or every
  // mutant on it is a static/ignored one with no tracked coverage — e.g. a
  // module-level object literal evaluated once at import time). Mutation
  // testing genuinely cannot judge these either way; only a real
  // `pnpm run test:coverage` run can confirm removal is safe.
  confidence: 'confirmed' | 'no-mutation-signal'
}

interface TestNode {
  file: string
  name: string
  // Mutants (by killedBy) this test independently kills, restricted to
  // mutants in the SAME source file's own-scope test group — used for the
  // architectural "is this test's mutation-kill contribution duplicated by
  // its own dedicated sibling" question. Never grounded by a different
  // file, even one that happens to also execute this code (e.g. an
  // integration test) — that coverage is incidental, not intentional, and
  // disappears silently the moment the other file changes for an
  // unrelated reason.
  killerSets: Set<Set<TestNode>>
  // Mutants (by coveredBy) this test executes, from ANY test file — used
  // for the real-coverage-safety question, which (unlike mutation-kill
  // redundancy) has no architectural boundary: any test that touches a
  // line keeps that line covered, integration test or not.
  coverageSets: Set<Set<TestNode>>
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  const existing = map.get(key)

  if (existing !== undefined) return existing

  const created = create()

  map.set(key, created)

  return created
}

// A test file belongs to a source file's "own scope" only if it's named
// exactly `<sourceBaseName>.test.ts` or `<sourceBaseName>.property.test.ts`
// in the SAME directory. A test in any other file (an integration test, a
// sibling unit's test file that happens to also exercise this code, etc.)
// must never be treated as grounding for removing THIS source file's own
// dedicated tests — that coverage is incidental, not intentional, and
// disappears silently the moment the other file changes for an unrelated
// reason.
function ownTestFilesFor(sourceFile: string): Set<string> {
  // Stryker's report always uses POSIX-style relative paths regardless of
  // OS, so `path.posix` (not the OS-dependent `path` default) is required
  // here to parse them correctly on Windows too.
  const dir = path.posix.dirname(sourceFile)
  const base = path.posix.basename(sourceFile).replace(/\.ts$/, '')

  return new Set([`${dir}/${base}.test.ts`, `${dir}/${base}.property.test.ts`])
}

/**
 * Finds tests that are provably redundant: removing them costs neither
 * mutation-kill coverage (checked against same-source-file tests only —
 * see {@link TestNode.killerSets}) nor real statement coverage (checked
 * against every test in the report — see {@link TestNode.coverageSets}).
 * Property-based tests (`*.property.test.ts`) are never candidates: they
 * exercise an unbounded input space, and mutation testing can only prove
 * they're unnecessary against the specific finite mutants generated this
 * run, not against every future bug the property's own generators could
 * still catch.
 *
 * A candidate's `confidence` is `'no-mutation-signal'` when its source
 * file has no usable Stryker data (see {@link RedundantTestCandidate}) —
 * these still pass both checks (vacuously — there's nothing to contradict
 * removal), but that "safety" isn't backed by real evidence, so they must
 * never be treated the same as a `'confirmed'` candidate.
 *
 * Requires the report to have been generated with `--disableBail` —
 * Stryker's default bails after the first failing test per mutant, so
 * `killedBy` normally reflects only one arbitrary test, not every test
 * that would independently kill it. Without `disableBail`, a genuinely
 * essential test can look redundant purely because some unrelated test
 * happened to run first.
 *
 * @public
 */
export function findRedundantTests(report: MutationReport): RedundantTestCandidate[] {
  const nodesByKey = new Map<string, TestNode>() // `file::id` -> node
  const nodesById = new Map<string, TestNode[]>() // bare id -> every node with that id

  for (const [testFile, def] of Object.entries(report.testFiles ?? {})) {
    for (const test of def.tests) {
      const node: TestNode = {
        file: testFile,
        name: test.name,
        killerSets: new Set(),
        coverageSets: new Set()
      }

      nodesByKey.set(`${testFile}::${test.id}`, node)
      getOrCreate(nodesById, test.id, () => []).push(node)
    }
  }

  // Resolves a bare Stryker test id to its TestNode. Returns undefined when
  // the bare id isn't unique across test files — Stryker's report doesn't
  // qualify killedBy/coveredBy ids by file, so a reused id can't be safely
  // attributed to one specific test.
  function resolveNode(bareId: string): TestNode | undefined {
    const nodes = nodesById.get(bareId)

    return nodes?.length === 1 ? nodes[0] : undefined
  }

  // Tracks, per source file, whether it has at least one mutant that
  // actually attributes coverage/kills to some real test — the basis for
  // 'no-mutation-signal'. A file absent from `report.files` entirely
  // (outside the mutate glob, e.g. test-utils.ts) never gets an entry
  // here, which read as "no signal" the same way.
  const sourceHasSignal = new Map<string, boolean>()

  for (const [sourceFile, fileResult] of Object.entries(report.files)) {
    const ownFiles = ownTestFilesFor(sourceFile)
    let hasSignal = false

    for (const mutant of fileResult.mutants) {
      const coverers = new Set<TestNode>()

      for (const bareId of mutant.coveredBy ?? []) {
        const node = resolveNode(bareId)

        if (node) coverers.add(node)
      }

      if (coverers.size > 0) hasSignal = true

      for (const node of coverers) node.coverageSets.add(coverers)

      if (mutant.status !== 'Killed') continue

      const killers = new Set<TestNode>()

      for (const bareId of mutant.killedBy ?? []) {
        const node = resolveNode(bareId)

        if (node && ownFiles.has(node.file)) killers.add(node)
      }

      for (const node of killers) node.killerSets.add(killers)
    }

    sourceHasSignal.set(sourceFile, hasSignal)
  }

  // test file -> whether its source file has real mutation-testing signal.
  const ownTestFileSignal = new Map<string, boolean>()

  for (const [sourceFile, hasSignal] of sourceHasSignal) {
    for (const f of ownTestFilesFor(sourceFile)) ownTestFileSignal.set(f, hasSignal)
  }

  // `present` tracks every test not yet removed — starts as ALL tests
  // (including property tests and out-of-scope tests like integration
  // tests), since those are never removed and must still count as valid
  // backup for whatever they happen to kill or cover. `candidates` maps
  // the separate, smaller set of tests the peel loop is actually allowed
  // to remove (own-scope, non-property tests only) to their source file's
  // signal status, carried alongside so the final result never needs a
  // lookup that could plausibly come back empty.
  const present = new Set(nodesByKey.values())
  const candidates = new Map<TestNode, boolean>()

  for (const node of present) {
    const hasSignal = ownTestFileSignal.get(node.file)

    if (hasSignal !== undefined && !node.file.endsWith('.property.test.ts')) {
      candidates.set(node, hasSignal)
    }
  }

  const removed: { node: TestNode; hasSignal: boolean }[] = []

  let changed = true

  while (changed) {
    changed = false

    for (const [node, hasSignal] of [...candidates]) {
      const backedBy = (sets: Set<Set<TestNode>>) =>
        [...sets].every((group) => {
          let remaining = 0

          for (const member of group) {
            if (member !== node && present.has(member)) remaining++
          }

          return remaining >= 1
        })

      if (backedBy(node.killerSets) && backedBy(node.coverageSets)) {
        present.delete(node)
        candidates.delete(node)
        removed.push({ node, hasSignal })
        changed = true
      }
    }
  }

  return removed.map(({ node, hasSignal }) => ({
    file: node.file,
    name: node.name,
    confidence: hasSignal ? 'confirmed' : 'no-mutation-signal'
  }))
}
