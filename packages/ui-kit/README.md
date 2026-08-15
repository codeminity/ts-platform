# @codeminity/ui-kit

Framework-agnostic UI components ([Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) built with [Lit](https://lit.dev)) for the Codeminity ecosystem, with a thin Vue binding — one package, two entry points.

## Install

```bash
pnpm add @codeminity/ui-kit
```

Only add `vue` if you're using the `/vue` entry — it's an optional peer dependency, not required for the framework-agnostic core.

## Usage

```ts
import '@codeminity/ui-kit'
```

```html
<cdmt-button variant="primary">Save</cdmt-button>
<cdmt-input placeholder="Email" type="email"></cdmt-input>
```

### Vue

```vue
<script setup lang="ts">
import { CdmtButton, CdmtInput } from '@codeminity/ui-kit/vue'
import { ref } from 'vue'
const email = ref('')
</script>

<template>
  <CdmtInput v-model="email" type="email" placeholder="you@example.com" />
  <CdmtButton variant="primary" @click="submit">Submit</CdmtButton>
</template>
```

Set up the initial theme once, at boot, in your `createApp(...)` call:

```ts
import { createUIKit } from '@codeminity/ui-kit/vue'

declare const app: { use: (plugin: unknown) => void } // your real `createApp(App)` result

app.use(createUIKit({ mode: 'auto' })) // 'light' | 'dark' | 'auto' — default: 'light'
```

## Components

| Tag             | Description                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<cdmt-button>` | A button with `primary`/`secondary`/`ghost` variants and a `disabled` state.                                                                                                                |
| `<cdmt-input>`  | A text input (`text`/`email`/`password`) with `disabled` and `invalid` states. `value` is a controlled property that stays in sync as the user types — listen for the native `input` event. |

See each component's `PARITY.md` (next to its source) for what's implemented vs. still missing.

## Theming

Every component reads its colors, spacing, radius, shadows, and transitions from `--cdmt-*` CSS custom properties, which inherit across shadow DOM boundaries and already resolve to sensible defaults with zero setup — theming is opt-in, not required.

Theme state is a live, framework-agnostic singleton, accessible from anywhere:

```ts
import { getThemeController, material } from '@codeminity/ui-kit'

const controller = getThemeController()
controller.setMode('dark') // 'light' | 'dark' | 'auto'
controller.toggleMode()
controller.setTheme(material)
```

A theme's colors are organized by role (`primary`, `secondary`, `accent`, `background`, `surface`, `border`, `positive`, `negative`, `info`, `warning`), each with its own `light`/`dark` pair, and each pair carrying a `value`, `onHover`, and `foreground`:

```ts
import { mergeTheme, material, getThemeController } from '@codeminity/ui-kit'

getThemeController().setTheme(
  mergeTheme(material, {
    colors: { primary: { light: { value: '#e11d48', onHover: '#be123c', foreground: '#ffffff' } } }
  })
)
```

`text` is the one exception — just a plain `{ light, dark }` string pair, since it isn't a background color anything else is colored with.

A fully custom theme (not just `material`) works the same way — `ThemePreset` is a plain structural type, no registration needed. Layer overrides onto a shipped preset with `mergeTheme` rather than hand-building the whole `ThemeTokens` object from scratch:

```ts
import { getThemeController, material, mergeTheme } from '@codeminity/ui-kit'

const myBrand = mergeTheme(material, {
  colors: { primary: { light: { value: '#0f172a' }, dark: { value: '#e2e8f0' } } },
  tokens: { fontFamily: 'Inter, sans-serif' }
})

getThemeController().setTheme(myBrand)
```

A theme built entirely from scratch (not derived from `material`) needs every `ThemeTokens` field — see `src/theme/theme.type.ts`.

Extra, app-specific named colors (beyond the built-in roles) work through `custom`:

```ts
import { material, mergeTheme } from '@codeminity/ui-kit'

mergeTheme(material, {
  custom: {
    accent2: {
      light: { value: '#f59e0b', onHover: '#d97706', foreground: '#000000' },
      dark: { value: '#fbbf24', onHover: '#fcd34d', foreground: '#000000' }
    }
  }
})
```

### Vue

```vue
<script setup lang="ts">
import { useTheme } from '@codeminity/ui-kit/vue'
const { mode, isDark, toggleMode, setMode } = useTheme()
</script>

<template>
  <button @click="toggleMode">{{ isDark ? 'Light' : 'Dark' }} mode</button>
</template>
```

`useTheme()` is a thin reactive wrapper around the same `getThemeController()` singleton — Vue-side state always matches whatever set it, from anywhere.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to add a new component or theme token, and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the package is structured.
