import { CHECK_STEPS, hasFailures, runFullCheck } from './full-check'

async function main() {
  console.log(`Running ${String(CHECK_STEPS.length)} checks...`)

  const results = await runFullCheck(CHECK_STEPS, {
    onStepStart: (step) => {
      console.log(`\n▶ ${step.name}`)
    },
    onStepComplete: (result) => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name} (${(result.durationMs / 1000).toFixed(1)}s)`)
    }
  })

  console.log('\n=== Full Check Summary ===')
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
  }

  if (hasFailures(results)) {
    console.log('\n❌ Full check failed.')
    process.exit(1)
  }

  console.log('\n✅ Full check passed.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
