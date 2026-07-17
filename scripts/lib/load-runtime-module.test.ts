import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadRuntimeModule } from './load-runtime-module'

describe('loadRuntimeModule', () => {
  it('loads runtime module from file path', async () => {
    const dir = join(tmpdir(), 'validate-api-test')

    mkdirSync(dir, { recursive: true })

    const file = join(dir, 'runtime-module.mjs')

    writeFileSync(
      file,
      `
        export const hello = 'world'
      `
    )

    const result = await loadRuntimeModule(file)

    expect(result.hello).toBe('world')

    rmSync(dir, { recursive: true, force: true })
  })
})
