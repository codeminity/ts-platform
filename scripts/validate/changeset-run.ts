import { validateChangeset } from './changeset'

async function main() {
  const validated = await validateChangeset()

  console.log(
    validated
      ? '✅ Changeset Required passed'
      : 'origin/main is not available (no git repository, no remote, or a shallow clone) — nothing to diff against, skipping'
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
