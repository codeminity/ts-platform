# drawer — checklist

## Props

- [x] model-value
- [x] side (left/right)
- [x] overlay
- [x] width
- [x] mini
- [x] mini-width
- [x] mini-to-overlay
- [x] no-mini-animation
- [x] breakpoint
- [x] behavior (default/desktop/mobile)
- [x] bordered
- [x] elevated
- [x] persistent (blocks backdrop-click and Escape from closing it)
- [x] show-if-above
- [ ] to/exact/replace/active-class/href/target (router/anchor-link behavior — deferred, no router integration in this package yet)
- [ ] no-swipe-open/no-swipe-close/no-swipe-backdrop (touch-swipe gestures aren't implemented at all yet, so there's nothing for these to disable)

## Slots

- [x] default
- [x] mini

## Events

- [x] update:model-value (real — backdrop click, Escape, and the show/hide/toggle methods all round-trip through this)
- [x] before-show / show / before-hide / hide
- [ ] mini-state — `mini` is a plain controlled prop here (no built-in hover-to-expand or breakpoint-driven auto-mini), so there's no internal trigger for this event to report

## Methods

- [x] show()
- [x] hide()
- [x] toggle()

## Theming

- [x] background (surface color role)
- [x] border
- [x] elevation (shadow)
- [x] transition duration/easing (width + transform)
