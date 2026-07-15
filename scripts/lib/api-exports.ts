import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

export interface ExpectedExports {
  runtime: string[]
  types: string[]
}

export function isExported(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined

  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

export function extractExportsFromText(source: string, fileName = 'index.ts'): ExpectedExports {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)

  const runtime = new Set<string>()

  const types = new Set<string>()

  function visit(node: ts.Node) {
    // Local declarations: only count them if actually exported from this file.
    if (isExported(node)) {
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
        types.add(node.name.text)
      }
    }

    // Re-exports: `export { a, b as c }`, `export { a } from '...'`, `export type { a } from '...'`.
    // This is the dominant export style in this codebase's index.ts files, so without this branch
    // the walker finds nothing to validate at all.
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        const name = element.name.text
        const typeOnly = node.isTypeOnly || element.isTypeOnly

        if (typeOnly) {
          types.add(name)
        } else {
          runtime.add(name)
        }
      }
    }

    // `export * from '...'` re-exports an unknown set of names without resolving the target
    // module here, so it's intentionally not expanded — the target package is responsible for
    // validating its own surface.

    // `export default ...`
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      runtime.add('default')
    }

    ts.forEachChild(node, visit)
  }

  visit(file)

  return {
    runtime: [...runtime],
    types: [...types]
  }
}

export function extractExportsFromSource(pkgPath: string): ExpectedExports {
  const entry = path.join(pkgPath, 'src/index.ts')

  if (!fs.existsSync(entry)) {
    return {
      runtime: [],
      types: []
    }
  }

  const source = fs.readFileSync(entry, 'utf8')

  return extractExportsFromText(source, entry)
}

export function hasTypeExport(dts: string, name: string): boolean {
  const localDeclaration = new RegExp(`\\b(interface|type|class|enum)\\s+${name}\\b`)

  if (localDeclaration.test(dts)) {
    return true
  }

  // Bundled .d.ts output commonly re-exports types rather than inlining them,
  // e.g. `export type { TokenMode } from './types/token-mode';`
  const reExportList = new RegExp(`export\\s+(type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}`)

  return reExportList.test(dts)
}
