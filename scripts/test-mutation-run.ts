import { runScopedMutationTesting } from './test-mutation'

runScopedMutationTesting().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
