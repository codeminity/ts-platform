import { verifyPackage } from './verify-package'

async function main() {
  await verifyPackage({
    packagePath: process.argv[2] ?? '.'
  })

  console.log('✅ Package verification passed')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
