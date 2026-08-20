import { validateDeps } from './validate-deps'

async function main() {
  await validateDeps()

  console.log('✅ Validate dependency architecture passed')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
