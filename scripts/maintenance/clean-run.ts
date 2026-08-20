import { clean } from './clean'

async function main() {
  await clean()

  console.log('✅ Removed build output, install artifacts, caches, and generated reports')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
