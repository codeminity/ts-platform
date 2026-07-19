import fs from 'node:fs'
import path from 'node:path'

export interface PackageJson {
  name: string
}

export function readPackageJson(packagePath: string): PackageJson {
  const content = fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')

  const json: unknown = JSON.parse(content)

  if (
    typeof json !== 'object' ||
    json === null ||
    !('name' in json) ||
    typeof json.name !== 'string'
  ) {
    throw new Error('Invalid package.json')
  }

  return {
    name: json.name
  }
}
