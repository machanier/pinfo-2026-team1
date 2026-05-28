import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// PINFO-190 — Auth0ProviderWithConfig fails fast at boot if any of the
// three Vite env vars is missing. In a test runtime we don't have a real
// Auth0 tenant, so seed the variables with placeholders. App-level tests
// mock useAuth0 / useApp directly, so these values never reach Auth0.
vi.stubEnv('VITE_AUTH0_DOMAIN', 'test.auth0.local')
vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'test-client-id')
vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://api.test.local')

// DEMO_MODE derives from import.meta.env.DEV, which Vitest sets to true. Left
// as-is, every page injects the fake preview identity and SAMPLE_EVENTS; pin it
// off so tests exercise real auth/data behaviour.
vi.mock('./lib/demoMode', () => ({
  DEMO_MODE: false,
  DEMO_ROLE: 'STUDENT',
  DEMO_USER: { name: 'Camille Démo', email: 'camille.demo@etu.unige.ch' },
}))

// jsdom here doesn't expose a usable localStorage/sessionStorage, so components
// that persist UI state (favourites in AppContext, layout mode in MainLayout)
// throw "getItem is not a function". Provide a minimal in-memory implementation.
function createMemoryStorage() {
  let store = {}
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
}
vi.stubGlobal('localStorage', createMemoryStorage())
vi.stubGlobal('sessionStorage', createMemoryStorage())

// jsdom implements neither Element.prototype.scrollTo nor window.scrollTo;
// MainLayout calls mainRef.current.scrollTo({ top: 0 }) on every navigation.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}
window.scrollTo = () => {}

afterEach(() => {
  cleanup()
})
