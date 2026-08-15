/**
 * The app shell's own light-DOM styling — kept as a plain string (not a
 * `.css` file) so this package stays TypeScript-only, mirroring how
 * `@codeminity/ui-kit`'s own components style themselves via Lit's `css`
 * tagged template. Injected once, into `<head>`, by `main.ts`.
 */
export const appStyles = `
  * {
    box-sizing: border-box;
  }

  /* Set by the inline boot script in index.html, removed by main.ts after
     the first frame settles — without this, the theme-controller's own
     unconditional "paint light, then paint the stored mode" boot sequence
     (see theme-controller.ts) can still ride the transition below and show
     as a brief color-change flash, even though the visible state is correct
     from the very first rendered frame either way. */
  html.no-transition, html.no-transition * {
    transition: none !important;
  }

  body {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: var(--cdmt-color-background);
    color: var(--cdmt-color-text);
    transition:
      background-color 200ms ease,
      color 200ms ease;
  }

  a {
    color: inherit;
  }

  .app-header__row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
  }

  .app-header__title {
    font-weight: var(--cdmt-font-weight-bold);
  }

  .app-header__spacer {
    flex: 1;
  }

  .app-drawer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1.5rem 1rem;
  }

  .app-drawer a {
    padding: 0.5rem 0.75rem;
    border-radius: var(--cdmt-radius-md);
    text-decoration: none;
    opacity: 0.7;
  }

  .app-drawer a.active {
    opacity: 1;
    background: var(--cdmt-color-surface);
    font-weight: var(--cdmt-font-weight-bold);
  }

  .app-main {
    padding: 2rem;
  }

  .page h1 {
    margin-top: 0;
  }

  .demo {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid var(--cdmt-color-border);
    border-radius: var(--cdmt-radius-md);
  }

  .snippet-tabs__row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  pre {
    background: #111827;
    color: #e5e7eb;
    padding: 1rem;
    border-radius: var(--cdmt-radius-md);
    overflow-x: auto;
  }

  .theme-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 1rem;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .swatch {
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    background: var(--swatch);
    cursor: pointer;
  }

  .swatch.active {
    border-color: var(--cdmt-color-text);
  }
`
