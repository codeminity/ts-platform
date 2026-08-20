import { validateDocs } from './validate-docs'

async function main() {
  await validateDocs()

  console.log('✅ Validate documents passed')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
