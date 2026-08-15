import type { Framework } from '../preferences.js'

export const buttonSnippets: Partial<Record<Framework, string>> = {
  core: `import '@codeminity/ui-kit'

const button = document.createElement('cdmt-button')
button.variant = 'primary'
button.textContent = 'Save'
button.addEventListener('click', () => {
  console.log('clicked')
})
document.body.append(button)`,
  vue: `<script setup lang="ts">
import { CdmtButton } from '@codeminity/ui-kit/vue'
</script>

<template>
  <CdmtButton variant="primary" @click="save">Save</CdmtButton>
</template>`
}
