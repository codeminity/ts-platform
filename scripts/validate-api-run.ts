import { validatePackages } from './validate-api'

try {
  const packages = await validatePackages()

  for (const pkg of packages) {
    console.log(`✅ API validated ${pkg}`)
  }
} catch (error) {
  console.error(error)
  process.exit(1)
}
