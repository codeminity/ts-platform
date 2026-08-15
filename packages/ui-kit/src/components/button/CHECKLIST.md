# button — checklist

## Props

- [x] variant (primary/secondary/ghost)
- [x] disabled
- [ ] type (submit/reset/anchor)
- [ ] icon / icon-right
- [ ] outline / flat / unelevated / push / glossy (visual style toggles beyond the fixed `variant` set)
- [ ] round / rounded / square (shape)
- [ ] size (xs/sm/md/lg/xl or custom CSS unit)
- [ ] padding (custom override)
- [ ] no-caps / no-wrap
- [ ] dense
- [ ] loading state (+ override content while loading)
- [ ] stack / stretch (layout of icon+label)
- [ ] align (content alignment)
- [ ] to / replace / href / target (router/anchor navigation behavior)
- [ ] tabindex
- [ ] ripple (interaction effect — see DECISIONS.md, deferred as a separate, non-token feature)

## Slots

- [x] default (label content)
- [ ] loading (override the loading indicator)

## Events

- [x] click (native, composed)

## Methods

- [ ] click() (programmatic)

## Theming

- [x] color roles (value/hover/foreground)
- [x] spacing
- [x] border width
- [x] radius
- [x] disabled opacity
- [x] focus ring
