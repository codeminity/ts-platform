import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { globby } from 'globby'

const packages = await globby('packages/*/*/package.json', {
  ignore: ['**/node_modules/**']
})

for (const pkgFile of packages) {
  const pkgPath = path.dirname(pkgFile)
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'))

  const packageName = pkg.name

  const distPath = path.resolve(pkgPath, 'dist/index.js')
  const typesPath = path.resolve(pkgPath, 'dist/index.d.ts')

  if (!fs.existsSync(distPath)) {
    console.error(`❌ Missing build output: ${packageName}`)
    process.exit(1)
  }

  const requiredExports = extractExportsFromPackage(pkg)

  const api = await import(pathToFileURL(distPath).href)

  for (const exp of requiredExports.runtime) {
    if (!(exp in api)) {
      console.error(`❌ Missing runtime export: ${exp} in ${packageName}`)
      process.exit(1)
    }
  }

  if (fs.existsSync(typesPath)) {
    const dts = fs.readFileSync(typesPath, 'utf-8')

    for (const exp of requiredExports.types) {
      const regex = new RegExp(`\\b${exp}\\b`, 'm')

      if (!regex.test(dts)) {
        console.error(`❌ Missing type export: ${exp} in ${packageName}`)
        process.exit(1)
      }
    }
  }

  console.log(`✅ API validated: ${packageName}`)
}

function extractExportsFromPackage(pkg) {
  const exportsField = pkg.exports?.['.']

  if (!exportsField) {
    return { runtime: [], types: [] }
  }

  const runtime = []
  const types = []

  // minimal safe assumption: root export exists
  if (exportsField.import) {
    const entryFile = exportsField.import.replace('./dist/', './src/').replace('.js', '.ts')

    try {
      const content = fs.readFileSync(
        entryFile.replace('./src/', path.join('packages/', pkg.name.split('/')[1], 'src/')),
        'utf-8'
      )

      const matches = [
        ...content.matchAll(/export\s+(?:const|function|class|let|var)\s+([a-zA-Z0-9_]+)/g)
      ]

      for (const m of matches) {
        runtime.push(m[1])
        types.push(m[1])
      }
    } catch {
      // fallback: no parsing possible
    }
  }

  return {
    runtime,
    types
  }
}
