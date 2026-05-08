import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When VITE_API_PROXY_TARGET is set (e.g. in Docker/CI), all /api/* traffic
// goes through that single gateway (Kong). In local Quarkus dev mode each
// service runs on its own port, so we route per-prefix directly.
const gatewayTarget = globalThis?.process?.env?.VITE_API_PROXY_TARGET

const localServicePorts = {
  '/api/users': 'http://localhost:8081',
  '/api/events': 'http://localhost:8082',
  '/api/notifications': 'http://localhost:8083',
  '/api/moderation': 'http://localhost:8084',
  '/api/search': 'http://localhost:8085',
  '/api/registrations': 'http://localhost:8086',
}

function buildProxy() {
  if (gatewayTarget) {
    return { '/api': { target: gatewayTarget, changeOrigin: true } }
  }
  return Object.fromEntries(
    Object.entries(localServicePorts).map(([path, target]) => [
      path,
      { target, changeOrigin: true },
    ]),
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // PINFO-213: in production builds, treat console.log/info/debug as
  // pure (side-effect-free) so esbuild strips the calls during
  // minification. This prevents the ~70 dev-time data dumps in src/
  // (full user profiles, API payloads, auth state) from shipping into
  // users' DevTools. console.error and console.warn are deliberately
  // NOT listed here — genuine errors still need to surface in prod for
  // ErrorBoundary, future Sentry hookups, etc.
  // In dev mode (`vite dev` / Vitest), no minification runs, so these
  // calls keep working as before for local debugging.
  esbuild: {
    pure: ['console.log', 'console.info', 'console.debug'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: buildProxy(),
  },
  test: {
    globals: true, // Permet d'éviter d'importer describe/it partout
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // --- AJOUT DE LA SECTION COVERAGE ---
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // 'lcov' génère le fichier pour SonarCloud
      include: ['src/**/*.{js,jsx}'],
      exclude: ['node_modules/', 'src/main.jsx', 'src/setupTests.js', '**/*.test.jsx'],
    },
  },
})
