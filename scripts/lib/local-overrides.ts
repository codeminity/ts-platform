/**
 * Recent pnpm versions (10+) no longer read the `pnpm.overrides` field from
 * `package.json` — overrides must live in `pnpm-workspace.yaml` instead.
 * This renders the overrides map as the minimal YAML pnpm expects there.
 */
export function toWorkspaceOverridesYaml(overrides: Record<string, string>): string {
  const lines = Object.entries(overrides).map(
    ([name, spec]) => `  ${JSON.stringify(name)}: ${JSON.stringify(spec)}`
  )

  return `overrides:\n${lines.join('\n')}\n`
}

function toFileSpecifier(tarballPath: string): string {
  // pnpm's `file:` specifier accepts forward slashes on every platform,
  // so normalizing unconditionally (rather than relying on the host OS's
  // path.sep) keeps this correct regardless of where it runs.
  return `file:${tarballPath.replace(/\\/g, '/')}`
}

/**
 * Builds a `pnpm.overrides` map that forces every OTHER locally-known
 * workspace package to resolve from its packed tarball instead of the
 * npm registry. This is what allows verifying an unreleased version
 * (e.g. an axios package depending on an unreleased request-core version)
 * entirely locally, without waiting for a real publish.
 */
export function buildLocalOverrides(
  packageName: string,
  localPackages?: Map<string, string>
): Record<string, string> | undefined {
  if (!localPackages) {
    return undefined
  }

  const overrides: Record<string, string> = {}

  for (const [name, tarballPath] of localPackages) {
    if (name === packageName) {
      continue
    }

    overrides[name] = toFileSpecifier(tarballPath)
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined
}
