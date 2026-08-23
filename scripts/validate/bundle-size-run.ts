import { validateBundleSize } from './bundle-size'

async function main() {
  const validated = await validateBundleSize()

  console.log(
    validated
      ? '✅ Bundle Size passed'
      : 'No built package output found — nothing to measure yet, skipping'
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
