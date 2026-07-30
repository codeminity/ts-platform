import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from './fixtures/bundle-package'
import { startApiServer, startPageServer } from './fixtures/echo-server'

import type { RunningServer } from './fixtures/echo-server'

declare global {
  interface Window {
    __runCookieRequest: (
      baseURL: string,
      useCookieMode: boolean
    ) => Promise<{ cookie: string | null }>
  }
}

let apiServer: RunningServer
let pageServer: RunningServer

test.beforeAll(async () => {
  const bundle = await bundlePackageForBrowser(
    new URL('../../packages/request/fetch/dist/index.js', import.meta.url)
  )

  // Same cross-origin setup as axios-cookie-mode.spec.ts, and for the same
  // reason: same-origin requests send cookies by default regardless of
  // `credentials`, so only a genuinely cross-origin request proves COOKIE
  // mode's `credentials: 'include'` is what actually causes this.
  const html = `<!doctype html>
<html>
  <body>
    <script type="module">
      import { createFetch, TokenModeEnum } from '/bundle.js'

      window.__runCookieRequest = async (baseURL, useCookieMode) => {
        const fetchWithAuth = createFetch(
          useCookieMode ? { tokenMode: TokenModeEnum.COOKIE } : {}
        )
        const response = await fetchWithAuth(baseURL + '/echo-cookie')
        return response.json()
      }
    </script>
  </body>
</html>`

  pageServer = await startPageServer(html, bundle)
  apiServer = await startApiServer(pageServer.url)
})

test.afterAll(async () => {
  await Promise.all([apiServer.close(), pageServer.close()])
})

test('COOKIE mode sends the real browser cookie jar cross-origin over a real fetch request', async ({
  page,
  context
}) => {
  await context.addCookies([
    {
      name: 'session',
      value: 'e2e-real-cookie',
      url: apiServer.url
    }
  ])

  await page.goto(pageServer.url)

  const result = await page.evaluate(
    ({ baseURL, useCookieMode }) => window.__runCookieRequest(baseURL, useCookieMode),
    { baseURL: apiServer.url, useCookieMode: true }
  )

  expect(result.cookie).toContain('session=e2e-real-cookie')
})

test('without COOKIE mode, the cross-origin cookie is not sent', async ({ page, context }) => {
  await context.addCookies([
    {
      name: 'session',
      value: 'e2e-real-cookie',
      url: apiServer.url
    }
  ])

  await page.goto(pageServer.url)

  const result = await page.evaluate(
    ({ baseURL, useCookieMode }) => window.__runCookieRequest(baseURL, useCookieMode),
    { baseURL: apiServer.url, useCookieMode: false }
  )

  expect(result.cookie).toBeNull()
})
