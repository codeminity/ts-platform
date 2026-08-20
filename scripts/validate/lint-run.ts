import { runScopedLint } from './lint'

runScopedLint().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
