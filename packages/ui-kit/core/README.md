# @codeminity/ui-kit-core

The actual UI components — plain [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) built with [Lit](https://lit.dev). No Vue, React, or Angular dependency, ever — that's the whole point: drop these into any existing app, regardless of what it's built with.

## Install

```bash
pnpm add @codeminity/ui-kit-core
```

## Usage

```ts
import '@codeminity/ui-kit-core'
```

```html
<cdmt-button variant="primary">Save</cdmt-button>
<cdmt-button variant="ghost" disabled>Cancel</cdmt-button>

<cdmt-input placeholder="Email" type="email"></cdmt-input>
```

## Components

| Tag             | Description                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<cdmt-button>` | A button with `primary`/`secondary`/`ghost` variants and a `disabled` state.                                                                                                               |
| `<cdmt-input>`  | A text input (`text`/`email`/`password`) with `disabled` and `invalid` states. `value` is a controlled property that stays in sync as the user types, listen for the native `input` event. |

## Theming

Every component reads its colors, radius, and transitions from `--cdmt-*` CSS custom properties, which inherit across shadow DOM boundaries. Apply a theme once, to the whole page:

```ts
import { applyTheme, material } from '@codeminity/ui-kit-core'

applyTheme(document.documentElement, material, 'light')
```

Call `applyTheme` again — with a different preset, or a different `mode` (`'light'` | `'dark'`, defaults to `'light'`) — to re-theme every component on the page at runtime, e.g. for a user-facing theme switcher.

A theme is split into two parts:

- **`tokens`** — brand colors, font, radius, transitions. Fixed across light/dark; this is what makes your primary/secondary colors stay put when the user's color scheme changes.
- **`light` / `dark`** — background, surface, border, and text colors. This is the part that actually changes between color schemes.

To customize a shipped preset, layer overrides onto it with `mergeTheme` instead of writing CSS by hand:

```ts
import { applyTheme, material, mergeTheme } from '@codeminity/ui-kit-core'

const myTheme = mergeTheme(material, {
  tokens: { radiusMd: '2px' },
  dark: { colorBg: '#0a0a0a' }
})

applyTheme(document.documentElement, myTheme, 'dark')
```

Only `material` ships today; more presets (a distinct "fancy", "energetic", ...) are added the same way, on demand.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to add a new component.
