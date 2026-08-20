import { runScopedTypecheck } from './typecheck'

runScopedTypecheck().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
