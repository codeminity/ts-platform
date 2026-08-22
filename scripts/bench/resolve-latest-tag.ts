// Parses the numeric dot-separated version out of a `<packageName>@<version>`
// tag. Deliberately not a general semver parser (no pre-release/build-
// metadata handling) — every tag this repo creates via Changesets is a
// plain `major.minor.patch` release, never a pre-release tag.
function versionParts(tag: string, prefix: string): number[] {
  return tag
    .slice(prefix.length)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
}

function compareVersionsDescending(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (b[index] ?? 0) - (a[index] ?? 0)

    if (diff !== 0) return diff
  }

  return 0
}

/**
 * Finds `packageName`'s own most recent release tag among `allTags` — this
 * repo's packages are independently versioned (see DECISIONS.md ADR-003),
 * so there is no single repo-wide "latest tag" to compare against; each
 * package's benchmarks must be checked against that package's own history.
 * Returns `undefined` if `packageName` has never been tagged (e.g. a
 * package that hasn't published its first release yet) — the caller skips
 * that package rather than comparing against nothing.
 *
 * @public
 */
export function resolveLatestTag(allTags: string[], packageName: string): string | undefined {
  const prefix = `${packageName}@`
  const matching = allTags.filter((tag) => tag.startsWith(prefix))

  if (matching.length === 0) return undefined

  return [...matching].sort((a, b) =>
    compareVersionsDescending(versionParts(a, prefix), versionParts(b, prefix))
  )[0]
}
