import { describe, expect, it } from 'vitest'

import { extractChangelogSection } from './changelog-section'

const changelog = `# @codeminity/example

## 0.2.0

### Features

- Add thing B

## 0.1.0

### Features

- Add thing A
`

describe('extractChangelogSection', () => {
  it('returns the trimmed content between a version heading and the next one', () => {
    expect(extractChangelogSection(changelog, '0.2.0')).toBe('### Features\n\n- Add thing B')
  })

  it('returns the trimmed content through end of file for the last version', () => {
    expect(extractChangelogSection(changelog, '0.1.0')).toBe('### Features\n\n- Add thing A')
  })

  it('returns null when the version heading is not found', () => {
    expect(extractChangelogSection(changelog, '9.9.9')).toBeNull()
  })
})
