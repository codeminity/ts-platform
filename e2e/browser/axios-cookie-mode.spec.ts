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
    new URL('../../packages/request/axios/dist/index.js', import.meta.url)
  )

  // Page and API are served on different ports, i.e. different origins, on
  // purpose: same-origin requests send cookies by default regardless of
  // `withCredentials`, so only a genuinely cross-origin request proves
  // COOKIE mode's `withCredentials: true` is what actually causes this.
  const html = `<!doctype html>
<html>
  <body>
    <script type="module">
      import { create, TokenModeEnum } from '/bundle.js'

      window.__runCookieRequest = async (baseURL, useCookieMode) => {
        const api = create({
          baseURL,
          codeminity: useCookieMode ? { tokenMode: TokenModeEnum.COOKIE } : {}
        })
        const response = await api.get('/echo-cookie')
        return response.data
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

test('COOKIE mode sends the real browser cookie jar cross-origin over a real XHR request', async ({
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
