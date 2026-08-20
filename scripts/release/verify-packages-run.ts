import { verifyPackages } from './verify-packages'

verifyPackages()
  .then(() => {
    console.log('✅ All packages verified')
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
