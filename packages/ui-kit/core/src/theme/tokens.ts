import { css } from 'lit'

// Design tokens as CSS custom properties, defined on `:host` so every
// component gets these defaults even if the host app never sets a theme,
// while still being overridable from outside without touching component
// internals — per-instance (`cdmt-button { --cdmt-color-primary: ... }`)
// or globally (`:root { --cdmt-color-primary: ...; }`, which every
// shadow root inherits custom properties from).
export const tokens = css`
  :host {
    --cdmt-color-primary: #4f46e5;
    --cdmt-color-primary-hover: #4338ca;
    --cdmt-color-on-primary: #ffffff;

    --cdmt-color-secondary: #e5e7eb;
    --cdmt-color-secondary-hover: #d1d5db;
    --cdmt-color-on-secondary: #111827;

    --cdmt-color-ghost-hover: rgb(79 70 229 / 8%);

    --cdmt-font-family: inherit;
    --cdmt-font-size: inherit;

    --cdmt-radius-md: 6px;

    --cdmt-transition-duration: 120ms;
    --cdmt-transition-easing: ease;
  }
`
