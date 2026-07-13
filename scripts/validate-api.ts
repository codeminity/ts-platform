import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { globby } from 'globby'
import ts from 'typescript'

const packages = await globby('packages/**/package.json', {
  ignore: ['**/node_modules/**']
})

for (const pkgFile of packages) {
  const pkgPath = path.dirname(pkgFile)

  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))

  const packageName = pkg.name

  const distPath = path.resolve(pkgPath, 'dist/index.js')

  const typesPath = path.resolve(pkgPath, 'dist/index.d.ts')

  if (!fs.existsSync(distPath)) {
    throw new Error(`Missing build output: ${packageName}`)
  }

  const expected = extractExportsFromSource(pkgPath)

  const runtime = await import(pathToFileURL(distPath).href)

  for (const name of expected.runtime) {
    if (!(name in runtime)) {
      throw new Error(`Missing runtime export ${name} in ${packageName}`)
    }
  }

  if (fs.existsSync(typesPath)) {
    const dts = fs.readFileSync(typesPath, 'utf8')

    for (const name of expected.types) {
      if (!hasTypeExport(dts, name)) {
        throw new Error(`Missing type export ${name} in ${packageName}`)
      }
    }
  }

  console.log(`✅ API validated ${packageName}`)
}

function extractExportsFromSource(pkgPath: string) {
  const entry = path.join(pkgPath, 'src/index.ts')

  if (!fs.existsSync(entry)) {
    return {
      runtime: [],
      types: []
    }
  }

  const source = fs.readFileSync(entry, 'utf8')

  const file = ts.createSourceFile(entry, source, ts.ScriptTarget.Latest, true)

  const runtime = new Set<string>()

  const types = new Set<string>()

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      runtime.add(node.name.text)
    }

    if (ts.isClassDeclaration(node) && node.name) {
      runtime.add(node.name.text)
    }

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((d) => {
        if (ts.isIdentifier(d.name)) {
          runtime.add(d.name.text)
        }
      })
    }

    if (ts.isInterfaceDeclaration(node)) {
      types.add(node.name.text)
    }

    if (ts.isTypeAliasDeclaration(node)) {
      types.add(node.name.text)
    }

    if (ts.isEnumDeclaration(node)) {
      runtime.add(node.name.text)
    }

    ts.forEachChild(node, visit)
  }

  visit(file)

  return {
    runtime: [...runtime],
    types: [...types]
  }
}

function hasTypeExport(dts: string, name: string) {
  const regex = new RegExp(`(interface|type|class|enum)\\s+${name}\\b`)

  return regex.test(dts)
}
