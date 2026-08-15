import { getThemeController, material, mergeTheme } from '@codeminity/ui-kit'

interface BrandColor {
  label: string
  light: { value: string; onHover: string; foreground: string }
  dark: { value: string; onHover: string; foreground: string }
}

// Same shape as `material`'s own `colors.primary` — a bare hex isn't enough
// to re-theme consistently: hover and the focus ring are independent tokens
// (see theme.type.ts) that need their own values, not just the resting one.
const DEFAULT_BRAND: BrandColor = {
  label: 'Indigo (default)',
  light: { value: '#4f46e5', onHover: '#4338ca', foreground: '#ffffff' },
  dark: { value: '#818cf8', onHover: '#a5b4fc', foreground: '#1e1b4b' }
}

const BRAND_COLORS: BrandColor[] = [
  DEFAULT_BRAND,
  {
    label: 'Rose',
    light: { value: '#e11d48', onHover: '#be123c', foreground: '#ffffff' },
    dark: { value: '#fb7185', onHover: '#fda4af', foreground: '#4c0519' }
  },
  {
    label: 'Emerald',
    light: { value: '#059669', onHover: '#047857', foreground: '#ffffff' },
    dark: { value: '#34d399', onHover: '#6ee7b7', foreground: '#022c22' }
  }
]

export function renderThemingPage(root: HTMLElement): () => void {
  const section = document.createElement('section')
  section.className = 'page'

  const heading = document.createElement('h1')
  heading.textContent = 'Theming'
  section.append(heading)

  const description = document.createElement('p')
  description.textContent =
    'Every component reads its colors, radius, and spacing from --cdmt-* CSS custom properties. Switching mode or brand color here re-paints the whole page live, through the shared ThemeController.'
  section.append(description)

  const controls = document.createElement('div')
  controls.className = 'theme-controls'

  const modeGroup = document.createElement('div')
  modeGroup.className = 'control-group'

  const lightButton = document.createElement('cdmt-button')
  lightButton.textContent = 'Light'

  const darkButton = document.createElement('cdmt-button')
  darkButton.textContent = 'Dark'

  modeGroup.append(lightButton, darkButton)

  const colorGroup = document.createElement('div')
  colorGroup.className = 'control-group'

  const swatches = BRAND_COLORS.map((brand) => {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'swatch'
    swatch.style.setProperty('--swatch', brand.light.value)
    swatch.setAttribute('aria-label', brand.label)
    colorGroup.append(swatch)
    return { brand, swatch }
  })

  controls.append(modeGroup, colorGroup)
  section.append(controls)

  const demo = document.createElement('div')
  demo.className = 'demo'

  const demoButton = document.createElement('cdmt-button')
  demoButton.variant = 'primary'
  demoButton.textContent = 'Primary'

  const demoInput = document.createElement('cdmt-input')
  demoInput.placeholder = 'Themed input'

  demo.append(demoButton, demoInput)
  section.append(demo)

  root.append(section)

  const controller = getThemeController()
  let selectedBrand = DEFAULT_BRAND

  function applyBrandColor(): void {
    const theme =
      selectedBrand === DEFAULT_BRAND
        ? material
        : mergeTheme(material, {
            colors: { primary: { light: selectedBrand.light, dark: selectedBrand.dark } },
            // focusRingColor is its own token, not derived from colors.primary
            // (material's default just happens to set it equal to primary) —
            // override it too, or focus rings would stay the old brand color.
            focusRingColor: {
              light: selectedBrand.light.value,
              dark: selectedBrand.dark.value
            }
          })
    controller.setTheme(theme)
  }

  function syncControls(): void {
    lightButton.variant = controller.isDark ? 'ghost' : 'primary'
    darkButton.variant = controller.isDark ? 'primary' : 'ghost'
    for (const { brand, swatch } of swatches) {
      swatch.classList.toggle('active', brand === selectedBrand)
    }
  }

  lightButton.addEventListener('click', () => {
    controller.setMode('light')
  })
  darkButton.addEventListener('click', () => {
    controller.setMode('dark')
  })

  for (const { brand, swatch } of swatches) {
    swatch.addEventListener('click', () => {
      selectedBrand = brand
      applyBrandColor()
      syncControls()
    })
  }

  const unsubscribe = controller.subscribe(syncControls)
  syncControls()

  return unsubscribe
}
