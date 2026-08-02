export function extractChangelogSection(changelog: string, version: string): string | null {
  const lines = changelog.split('\n')

  const startIndex = lines.findIndex((line) => line.trim() === `## ${version}`)

  if (startIndex === -1) {
    return null
  }

  const relativeEndIndex = lines.slice(startIndex + 1).findIndex((line) => line.startsWith('## '))

  const endIndex = relativeEndIndex === -1 ? lines.length : startIndex + 1 + relativeEndIndex

  return lines
    .slice(startIndex + 1, endIndex)
    .join('\n')
    .trim()
}
