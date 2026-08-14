# @codeminity/ui-kit-vue

Vue bindings for [`@codeminity/ui-kit-core`](../core#readme). `CdmtInput` gets real `v-model` support; `CdmtButton` is typed prop pass-through — both render the real `cdmt-*` custom elements underneath, so theming (`applyTheme`) works exactly the same as using the elements directly.

## Install

```bash
pnpm add @codeminity/ui-kit-vue vue
```

`vue` is a peer dependency — bring your own.

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { CdmtButton, CdmtInput } from '@codeminity/ui-kit-vue'

const email = ref('')
</script>

<template>
  <CdmtInput v-model="email" type="email" placeholder="Email" />
  <CdmtButton variant="primary" @click="submit">Save</CdmtButton>
</template>
```

## Components

| Component    | Wraps           | Notes                                                                                                      |
| ------------ | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `CdmtButton` | `<cdmt-button>` | `variant`/`disabled` props, slot forwarded. `@click` and other native DOM events work with no translation. |
| `CdmtInput`  | `<cdmt-input>`  | `v-model` (`type`/`placeholder`/`disabled`/`invalid` also exposed as props).                               |

## Theming

Unaffected by this package — call `applyTheme`/`mergeTheme` from `@codeminity/ui-kit-core` exactly as documented there. These wrappers only translate props/events; the actual rendering and theming happen in the underlying custom elements.
