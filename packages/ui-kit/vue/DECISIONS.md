# Architecture Decisions (`@codeminity/ui-kit-vue`)

This document records decisions specific to this package. Repo-wide decisions live in the [root `DECISIONS.md`](../../../DECISIONS.md) instead.

---

## Index

- [ADR-001: No `.vue` SFC Files](#adr-001-no-vue-sfc-files)

---

## ADR-001: No `.vue` SFC Files

**Context:** The conventional way to author a Vue component is a `.vue` Single-File Component, which requires a template compiler (`@vitejs/plugin-vue`, `vue-loader`, or similar) as part of the build. Every other package in this monorepo builds with plain `tsup` — no bundler-level framework plugin exists anywhere in this repo today.

**Decision:** Every wrapper is a plain TypeScript `defineComponent` with a render function (`h(...)`), not a `.vue` file. `h('cdmt-input', { ... })` renders the custom element directly; there's no template string for a compiler to process.

**Consequences:** This package builds with the exact same `tsup` setup as `@codeminity/ui-kit-core` — no new build tooling added to the monorepo for it. The tradeoff: render functions are less familiar to read than SFC templates for anyone used to `.vue` files, and there's no `<template>`-level editor tooling (syntax highlighting tuned for Vue templates, etc.) — an acceptable cost given these wrappers are thin (prop pass-through plus, at most, one event-to-emit translation) rather than app-level UI with real markup complexity. If a future wrapper needs substantial internal markup, revisit this decision rather than forcing everything through `h()` indefinitely.
