// The subset of `vitest bench --outputJson`'s report shape this package
// actually reads — Vitest's own report carries many more fields (samples,
// percentiles, rank, ...) that comparison doesn't need.
export interface VitestBenchReport {
  files: {
    filepath: string
    groups: {
      fullName: string
      benchmarks: {
        name: string
        mean: number
      }[]
    }[]
  }[]
}
