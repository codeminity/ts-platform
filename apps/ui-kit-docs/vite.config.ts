import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves a project site (not a user/org page) at
  // https://<org>.github.io/<repo>/ — this is ts-platform's own Pages site.
  base: '/ts-platform/',
  // Vite's default dev host only binds the IPv6 loopback (`::1`) — refused
  // by `localhost`/`127.0.0.1` in this environment (hit while verifying this
  // app; confirmed real, not sandbox-specific). Bind IPv4 loopback explicitly.
  server: {
    host: '127.0.0.1'
  },
  build: {
    outDir: 'dist'
  }
})
