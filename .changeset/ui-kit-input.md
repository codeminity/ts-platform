---
"@codeminity/ui-kit-core": minor
---

Add `<cdmt-input>`: a text input (`text`/`email`/`password`) with `disabled` and `invalid` states. `value` is a controlled property that stays in sync as the user types, so a framework wrapper (e.g. Vue's `v-model`) can bind to it directly — listen for the native `input` event. Adds a new `colorDanger` brand token, used for the `invalid` state's border color.
