import type { ThemePreset } from '../theme.type.js'

/**
 * The default theme preset — a Material-inspired look. Ships as the
 * package's zero-JS `:host` fallback (see `theme/tokens.ts`) and as the
 * starting point for {@link applyTheme}.
 *
 * @public
 */
export const material: ThemePreset = {
  tokens: {
    colorPrimary: '#4f46e5',
    colorPrimaryHover: '#4338ca',
    colorOnPrimary: '#ffffff',
    colorSecondary: '#e5e7eb',
    colorSecondaryHover: '#d1d5db',
    colorOnSecondary: '#111827',
    colorGhostHover: 'rgb(79 70 229 / 8%)',
    colorDanger: '#dc2626',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    radiusMd: '6px',
    transitionDuration: '120ms',
    transitionEasing: 'ease'
  },
  light: {
    colorBg: '#ffffff',
    colorSurface: '#ffffff',
    colorBorder: '#e5e7eb',
    colorText: '#111827'
  },
  dark: {
    colorBg: '#121212',
    colorSurface: '#1e1e1e',
    colorBorder: '#333333',
    colorText: '#e5e7eb'
  }
}
