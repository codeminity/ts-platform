import { cruise } from 'dependency-cruiser'

import type { IFlattenedRuleSet } from 'dependency-cruiser'

// Matches any packages/<category>/core/src, so a new category added later is
// covered automatically — nothing here needs updating when one is added.
const ruleSet: IFlattenedRuleSet = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make module boundaries and load order unpredictable.',
      from: {},
      to: { circular: true }
    },
    {
      name: 'core-no-adapter-deps',
      severity: 'error',
      comment:
        'A category\'s own "core" package must stay usable by any sibling adapter without knowing about the others — see ARCHITECTURE.md#dependency-rules.',
      from: { path: '^packages/([^/]+)/core/src' },
      to: { path: '^packages/$1/(?!core/)' }
    }
  ]
}

export async function validateDeps(): Promise<void> {
  const result = await cruise(['packages'], {
    validate: true,
    ruleSet,
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    // `cruise(['packages'], ...)` walks the whole packages/ tree, not just
    // src/ — without excluding dist/, this rule set (which only ever
    // targets packages/**/src paths) also crawled generated build output.
    // dist/ is actively rewritten by the concurrently-running Build
    // full-check step, so this could race it mid-write and crash with an
    // ENOENT on an esbuild content-hashed chunk file that existed a moment
    // earlier — confirmed directly. `node_modules`/`temp` are excluded too:
    // neither is architecture this rule set cares about, and both are
    // pointless (or, for temp/, similarly racy against Verify Packages) to
    // crawl regardless.
    exclude: '\\.test\\.ts$|/(dist|node_modules|temp)/',
    doNotFollow: 'node_modules',
    outputType: 'err'
  })

  if (result.exitCode !== 0) {
    throw new Error(
      typeof result.output === 'string' ? result.output : JSON.stringify(result.output)
    )
  }
}
