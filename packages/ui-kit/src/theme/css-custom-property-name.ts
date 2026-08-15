/**
 * Converts a flat, camelCase token key (e.g. `colorPrimaryHover`) into its
 * `--cdmt-*` CSS custom property name (`--cdmt-color-primary-hover`).
 *
 * @public
 */
export function toCssCustomPropertyName(key: string): string {
  return `--cdmt-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
}
