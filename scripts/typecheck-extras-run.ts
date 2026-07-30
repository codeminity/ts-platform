import { typecheckExtras } from './typecheck-extras'

async function main() {
  await typecheckExtras()

  console.log('✅ Typecheck (extras) passed')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
