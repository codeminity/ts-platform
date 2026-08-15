import type { Framework } from '../preferences.js'

export const inputSnippets: Partial<Record<Framework, string>> = {
  core: `import '@codeminity/ui-kit'

const input = document.createElement('cdmt-input')
input.type = 'email'
input.placeholder = 'you@example.com'
input.addEventListener('input', (event) => {
  console.log((event.target as HTMLInputElement).value)
})
document.body.append(input)`,
  vue: `<script setup lang="ts">
import { CdmtInput } from '@codeminity/ui-kit/vue'
import { ref } from 'vue'

const email = ref('')
</script>

<template>
  <CdmtInput v-model="email" type="email" placeholder="you@example.com" />
</template>`
}
