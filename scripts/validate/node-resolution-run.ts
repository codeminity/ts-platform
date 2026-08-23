import { validateNodeResolution } from './node-resolution'

async function main() {
  const validated = await validateNodeResolution()

  console.log(
    validated
      ? '✅ Node Module Resolution passed'
      : 'No package source files found — nothing to validate yet, skipping'
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
