import { renderButtonPage } from '../pages/button.js'
import { renderHomePage } from '../pages/home.js'
import { renderInputPage } from '../pages/input.js'
import { renderThemingPage } from '../pages/theming.js'

export interface Page {
  path: string
  title: string
  render: (root: HTMLElement) => (() => void) | undefined
}

export const homePage: Page = { path: '#/', title: 'Overview', render: renderHomePage }

export const pages: Page[] = [
  homePage,
  { path: '#/button', title: 'Button', render: renderButtonPage },
  { path: '#/input', title: 'Input', render: renderInputPage },
  { path: '#/theming', title: 'Theming', render: renderThemingPage }
]
