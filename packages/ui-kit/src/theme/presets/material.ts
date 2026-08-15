import type { ThemePreset } from '../theme.type.js'

/**
 * The default, Material-inspired theme preset.
 *
 * @public
 */
export const material: ThemePreset = {
  tokens: {
    colors: {
      primary: {
        light: { value: '#4f46e5', onHover: '#4338ca', foreground: '#ffffff' },
        dark: { value: '#818cf8', onHover: '#a5b4fc', foreground: '#1e1b4b' }
      },
      secondary: {
        light: { value: '#6b7280', onHover: '#4b5563', foreground: '#ffffff' },
        dark: { value: '#9ca3af', onHover: '#d1d5db', foreground: '#111827' }
      },
      accent: {
        light: { value: '#06b6d4', onHover: '#0891b2', foreground: '#ffffff' },
        dark: { value: '#22d3ee', onHover: '#67e8f9', foreground: '#083344' }
      },
      background: {
        light: { value: '#ffffff', onHover: '#ffffff', foreground: '#111827' },
        dark: { value: '#0a0a0a', onHover: '#0a0a0a', foreground: '#f9fafb' }
      },
      surface: {
        light: { value: '#f9fafb', onHover: '#f3f4f6', foreground: '#111827' },
        dark: { value: '#171717', onHover: '#262626', foreground: '#f9fafb' }
      },
      border: {
        light: { value: '#e5e7eb', onHover: '#d1d5db', foreground: '#9ca3af' },
        dark: { value: '#27272a', onHover: '#3f3f46', foreground: '#71717a' }
      },
      positive: {
        light: { value: '#16a34a', onHover: '#15803d', foreground: '#ffffff' },
        dark: { value: '#4ade80', onHover: '#86efac', foreground: '#052e16' }
      },
      negative: {
        light: { value: '#dc2626', onHover: '#b91c1c', foreground: '#ffffff' },
        dark: { value: '#f87171', onHover: '#fca5a5', foreground: '#450a0a' }
      },
      info: {
        light: { value: '#2563eb', onHover: '#1d4ed8', foreground: '#ffffff' },
        dark: { value: '#60a5fa', onHover: '#93c5fd', foreground: '#172554' }
      },
      warning: {
        light: { value: '#d97706', onHover: '#b45309', foreground: '#111827' },
        dark: { value: '#fbbf24', onHover: '#fcd34d', foreground: '#451a03' }
      },
      text: { light: '#111827', dark: '#f9fafb' }
    },

    fontFamily: 'system-ui, sans-serif',
    fontSize: '1rem',
    fontWeightNormal: '400',
    fontWeightBold: '600',
    lineHeight: '1.5',

    radiusXs: '2px',
    radiusSm: '4px',
    radiusMd: '6px',
    radiusLg: '12px',
    radiusFull: '9999px',

    spacingXs: '0.25em',
    spacingSm: '0.5em',
    spacingMd: '0.75em',
    spacingLg: '1em',
    spacingXl: '1.25em',

    shadowXs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    shadowSm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    shadowXl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',

    borderWidth: '1px',
    opacityDisabled: '0.5',

    focusRingColor: { light: '#4f46e5', dark: '#818cf8' },
    focusRingWidth: '2px',

    transitionDuration: '150ms',
    transitionEasing: 'ease'
  }
}
