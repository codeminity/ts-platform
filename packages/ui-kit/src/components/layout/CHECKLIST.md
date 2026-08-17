# layout — checklist

## Props

- [x] fixed-header
- [x] fixed-footer
- [x] fixed-left-drawer
- [x] fixed-right-drawer
- [x] header-over-left-drawer
- [x] header-over-right-drawer
- [x] footer-over-left-drawer
- [x] footer-over-right-drawer
- [x] container
- [x] transition-duration (no Quasar equivalent — overrides the theme's `transitionDuration` token for just this layout's header/footer/drawer transitions)

## Slots

- [x] default (header/footer/drawer/page-container children, auto-routed by tag name — no explicit `slot` attributes needed)

## Events

- [ ] resize
- [ ] scroll
- [ ] scroll-height

## Methods

(none — Quasar's own layout component doesn't expose any either)

## Theming

- (no direct color/spacing tokens of its own — purely a structural coordinator; header/footer/drawer/page carry the themeable surface)
