import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

export interface RunningServer {
  url: string
  close: () => Promise<void>
}

function listen(server: Server): Promise<RunningServer> {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (address === null || typeof address === 'string') {
        reject(new Error('Failed to bind server to a port'))
        return
      }

      resolve({
        url: `http://127.0.0.1:${String(address.port)}`,
        close: () =>
          new Promise((resolveClose) => {
            server.close(() => {
              resolveClose()
            })
          })
      })
    })
  })
}

/**
 * Serves the test page (HTML + bundled axios module) on its own origin,
 * deliberately separate from {@link startApiServer} — same-origin requests
 * send cookies by default regardless of `withCredentials`, so proving that
 * setting works at all requires a genuinely cross-origin request.
 */
export function startPageServer(html: string, bundledScript: string): Promise<RunningServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/bundle.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' })
      res.end(bundledScript)
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  })

  return listen(server)
}

/**
 * Serves a cross-origin `/echo-cookie` endpoint that reports exactly which
 * `Cookie` header (if any) the browser actually sent, with CORS configured to
 * require an explicit, credentialed origin — mirroring a real third-party API.
 */
export function startApiServer(pageOrigin: string): Promise<RunningServer> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', pageOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ cookie: req.headers.cookie ?? null }))
  })

  return listen(server)
}
