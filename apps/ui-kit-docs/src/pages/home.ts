function heading(level: 'h1' | 'h2', text: string): HTMLElement {
  const el = document.createElement(level)
  el.textContent = text
  return el
}

function paragraph(text: string): HTMLElement {
  const el = document.createElement('p')
  el.textContent = text
  return el
}

function codeBlock(code: string): HTMLElement {
  const pre = document.createElement('pre')
  const codeEl = document.createElement('code')
  codeEl.textContent = code
  pre.append(codeEl)
  return pre
}

export function renderHomePage(root: HTMLElement): undefined {
  const section = document.createElement('section')
  section.className = 'page'

  section.append(
    heading('h1', 'ui-kit'),
    paragraph(
      'Framework-agnostic Web Components (built with Lit) for the Codeminity ecosystem, with a thin Vue binding. No Vue, React, or Angular required for the core.'
    ),

    heading('h2', 'Install'),
    codeBlock(`pnpm add @codeminity/ui-kit

# using the Vue binding? vue is an optional peer dependency:
pnpm add @codeminity/ui-kit vue`),

    heading('h2', 'Quick start — plain HTML/JS'),
    paragraph(
      'Every component works out of the box with sensible default styling — no setup required. The default theme values are baked in as CSS fallbacks, so nothing needs to run before a component looks right.'
    ),
    codeBlock(`import '@codeminity/ui-kit'

const button = document.createElement('cdmt-button')
button.variant = 'primary'
button.textContent = 'Save'
document.body.append(button)`),

    heading('h2', 'Quick start — Vue'),
    paragraph('Register the initial theme once, at boot, then import components per-file:'),
    codeBlock(`// main.ts
import { createApp } from 'vue'
import { createUIKit } from '@codeminity/ui-kit/vue'

const app = createApp(App)
app.use(createUIKit())   // material preset, light mode, by default
app.mount('#app')`),
    codeBlock(`<!-- App.vue -->
<script setup lang="ts">
import { CdmtButton, CdmtInput } from '@codeminity/ui-kit/vue'
import { ref } from 'vue'

const email = ref('')
</script>

<template>
  <CdmtInput v-model="email" type="email" placeholder="you@example.com" />
  <CdmtButton variant="primary" @click="submit">Submit</CdmtButton>
</template>`),

    heading('h2', 'Theming — live mode switching'),
    paragraph(
      'A stateful ThemeController (getThemeController()) is shared everywhere — Vue, another framework, or a plain script all read/write the same instance. See the Theming page for a live example.'
    ),
    codeBlock(`// Vue — reactive
import { useTheme } from '@codeminity/ui-kit/vue'
const { mode, isDark, toggleMode, setMode } = useTheme()`),
    codeBlock(`// Anywhere else — no framework required
import { getThemeController } from '@codeminity/ui-kit'
getThemeController().toggleMode()
getThemeController().setMode('auto')   // follow prefers-color-scheme`),

    heading('h2', 'Theming — customizing the brand color'),
    paragraph(
      'mergeTheme() layers overrides onto a shipped preset without forking it. A color role needs its onHover and foreground set too, not just value — and focusRingColor is its own separate token (material just happens to default it to the same value as primary), so override it alongside colors if you want focus rings to match.'
    ),
    codeBlock(`import { getThemeController, material, mergeTheme } from '@codeminity/ui-kit'

const brand = mergeTheme(material, {
  colors: {
    primary: {
      light: { value: '#e11d48', onHover: '#be123c', foreground: '#ffffff' },
      dark: { value: '#fb7185', onHover: '#fda4af', foreground: '#4c0519' }
    }
  },
  focusRingColor: { light: '#e11d48', dark: '#fb7185' }
})

getThemeController().setTheme(brand)
// or, at Vue boot: app.use(createUIKit({ theme: brand }))`),

    heading('h2', 'Advanced — a fully custom theme'),
    paragraph(
      'ThemePreset is a plain structural type ({ tokens }) — building one from scratch works identically to overriding material, no registration step:'
    ),
    codeBlock(`import type { ThemePreset } from '@codeminity/ui-kit'

const myBrand: ThemePreset = {
  tokens: {
    colors: {
      primary: {
        light: { value: '#111827', onHover: '#0b0f19', foreground: '#ffffff' },
        dark: { value: '#e5e7eb', onHover: '#f3f4f6', foreground: '#111827' }
      },
      // ...every other ThemeColors role (secondary, accent, background, ...)
      text: { light: '#111827', dark: '#f9fafb' }
    }
    // ...every other ThemeTokens field (spacing, radius, shadow, ...)
  }
}

getThemeController().setTheme(myBrand)`),

    heading('h2', 'Next steps'),
    paragraph(
      'Browse Button and Input on the left for the full live demo and per-framework usage snippet for each component.'
    )
  )

  root.append(section)
}
