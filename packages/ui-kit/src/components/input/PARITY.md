# input — parity checklist

## Props

- [x] value (controlled)
- [x] type — currently text/email/password only, missing textarea/search/tel/file/number/url/time/date/datetime-local
- [x] placeholder
- [x] disabled
- [x] invalid
- [ ] name/autocomplete/id passthrough to the inner native input (a label can't currently be `for`-linked to it)
- [ ] readonly
- [ ] autofocus
- [ ] maxlength
- [ ] min/max/pattern/step
- [ ] mask / fill-mask / reverse-fill-mask / unmasked-value / mask-tokens
- [ ] label / stack-label (floating vs. always-visible label)
- [ ] hint / hide-hint
- [ ] prefix / suffix
- [ ] filled / outlined / borderless / standout (visual style variants)
- [ ] dense
- [ ] error-message (paired with `invalid`)
- [ ] rules / reactive-rules / lazy-rules (built-in validation)
- [ ] clearable / clear-icon
- [ ] counter (character count display)
- [ ] loading state
- [ ] debounce (delay before the controlled value updates)
- [ ] autogrow (textarea auto-expand)
- [ ] input-class / input-style (styling passthrough to the native input)

## Slots

- [ ] prepend / append (inside the field, start/end)
- [ ] before / after (outside the field, start/end)
- [ ] label (custom label content)
- [ ] error / hint / counter (bottom content)
- [ ] loading

## Events

- [x] input (native, composed — the controlled-value sync mechanism)
- [ ] focus
- [ ] blur
- [ ] clear

## Methods

- [ ] validate() / resetValidation()
- [ ] focus() / blur() / select()

## Theming

- [x] color roles (value/hover/foreground)
- [x] spacing
- [x] border width
- [x] radius
- [x] disabled opacity
- [x] focus ring
