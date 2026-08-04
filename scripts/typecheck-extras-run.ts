import { typecheckExtras } from './typecheck-extras'

async function main() {
  // `tsc --noEmit` prints nothing on success, so without this the whole
  // loop looks hung until the very last one finishes.
  await typecheckExtras((tsconfig) => {
    console.log(`  checking ${tsconfig}...`)
  })

  console.log('✅ Typecheck (extras) passed')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
