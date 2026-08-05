import { validatePackages } from './validate-api-exports'

try {
  const packages = await validatePackages()

  for (const pkg of packages) {
    console.log(`✅ API exports validated for ${pkg}`)
  }
} catch (error) {
  console.error(error)
  process.exit(1)
}
