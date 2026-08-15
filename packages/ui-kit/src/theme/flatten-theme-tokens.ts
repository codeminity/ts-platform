import type { ColorRole, ThemeMode, ThemeTokens } from './theme.type.js'

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function flattenColorRole(name: string, role: ColorRole, flat: Record<string, string>): void {
  const capitalized = capitalize(name)

  flat[`color${capitalized}`] = role.value
  flat[`color${capitalized}Hover`] = role.onHover
  flat[`color${capitalized}Foreground`] = role.foreground
}

/**
 * Walks a {@link ThemeTokens} object and produces a flat
 * `{ flatKey: resolvedValue }` map for the given {@link ThemeMode} — e.g.
 * `colors.primary.light` becomes `colorPrimary`/`colorPrimaryHover`/
 * `colorPrimaryForeground`, `text.light` becomes `colorText`, scalar fields
 * (spacing/radius/typography/...) pass through under their own name.
 *
 * The single source of truth for "what CSS custom property does this token
 * become" — used by both `applyTheme()` (to know what to paint) and
 * `css-var.ts`'s default-values map (so `themeVar()`'s fallbacks can never
 * drift out of sync with what gets painted).
 *
 * @public
 */
export function flattenThemeTokens(tokens: ThemeTokens, mode: ThemeMode): Record<string, string> {
  const { colors, custom, focusRingColor, ...scalars } = tokens

  const flat: Record<string, string> = {}

  for (const [key, value] of Object.entries(scalars)) {
    flat[key] = value
  }

  flat.focusRingColor = focusRingColor[mode]

  for (const [roleName, role] of Object.entries(colors)) {
    if (roleName === 'text') {
      flat.colorText = (role as { light: string; dark: string })[mode]
      continue
    }

    flattenColorRole(roleName, (role as { light: ColorRole; dark: ColorRole })[mode], flat)
  }

  if (custom) {
    for (const [name, role] of Object.entries(custom)) {
      flattenColorRole(name, role[mode], flat)
    }
  }

  return flat
}
