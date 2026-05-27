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

// Cloudinary — provide placeholder values so module-level constants in
// BannerUpload.jsx and cloudinaryAvatar.js see a configured environment.
// Individual test files (e.g. cloudinaryAvatar.test.js) override these as
// needed and restore them via vi.unstubAllEnvs() in their own afterEach.
vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'testcloud')
vi.stubEnv('VITE_CLOUDINARY_BANNER_UPLOAD_PRESET', 'banner_test')
vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'test_preset')

afterEach(() => {
  cleanup()
})
