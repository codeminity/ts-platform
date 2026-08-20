import fs from 'node:fs'
import path from 'node:path'

import { extractChangelogSection } from '../lib/changelog-section'
import { findWorkspacePackages } from '../lib/package-discovery'
import { readPackageJson } from '../lib/read-package-json'

function findPackageDirByName(name: string, packagesDir: string): string | null {
  for (const packageDir of findWorkspacePackages(packagesDir)) {
    if (readPackageJson(packageDir).name === name) {
      return packageDir
    }
  }

  return null
}

// A publish tag looks like "@codeminity/axios@0.7.1" — the package name
// itself contains an "@", so the version is everything after the *last* "@".
export function parseReleaseTag(tag: string): { name: string; version: string } {
  const lastAtIndex = tag.lastIndexOf('@')

  return {
    name: tag.slice(0, lastAtIndex),
    version: tag.slice(lastAtIndex + 1)
  }
}

export function getReleaseNotes(tag: string, packagesDir = 'packages'): string {
  const { name, version } = parseReleaseTag(tag)

  const packageDir = findPackageDirByName(name, packagesDir)

  if (!packageDir) {
    throw new Error(`Could not find a workspace package named "${name}"`)
  }

  const changelogPath = path.join(packageDir, 'CHANGELOG.md')
  const changelog = fs.readFileSync(changelogPath, 'utf8')

  const section = extractChangelogSection(changelog, version)

  if (section === null) {
    throw new Error(`No CHANGELOG.md section for version "${version}" in ${changelogPath}`)
  }

  return section
}

function buildInstallSection(name: string, version: string): string {
  const npmUrl = `https://www.npmjs.com/package/${name}/v/${version}`

  return [
    '## Install',
    '```bash\n' + `pnpm add ${name}@${version}` + '\n```',
    '```bash\n' + `npm install ${name}@${version}` + '\n```',
    '```bash\n' + `yarn add ${name}@${version}` + '\n```',
    `📦 [${name}@${version} on npm](${npmUrl})`
  ].join('\n\n')
}

export function buildReleaseNotes(tag: string, packagesDir = 'packages'): string {
  const { name, version } = parseReleaseTag(tag)

  return [getReleaseNotes(tag, packagesDir), '---', buildInstallSection(name, version)].join('\n\n')
}
