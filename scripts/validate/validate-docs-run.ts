import { validateDocs } from './validate-docs'

async function main() {
  const validated = await validateDocs()

  console.log(
    validated
      ? '✅ Validate documents passed'
      : 'No TypeScript code blocks found in any doc — nothing to validate yet, skipping'
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
