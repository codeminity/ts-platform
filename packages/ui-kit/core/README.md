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
```

## Components

| Tag             | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| `<cdmt-button>` | A button with `primary`/`secondary`/`ghost` variants and a `disabled` state. |

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for how to add a new component.
