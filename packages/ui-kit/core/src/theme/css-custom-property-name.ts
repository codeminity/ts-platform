// camelCase token keys -> --cdmt-kebab-case custom property names, e.g.
// `colorOnPrimary` -> `--cdmt-color-on-primary`. Shared by `apply-theme.ts`
// (runtime) and `tokens.ts` (the static zero-JS fallback), so both stay in
// sync with the same naming rule.
export function toCssCustomPropertyName(key: string): string {
  return `--cdmt-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}
