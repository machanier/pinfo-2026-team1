/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Spy on Auth0Provider so we can assert what config we forward without
// dragging the actual Auth0 SDK into a test runtime.
vi.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children, ...props }) => (
    <div data-testid="auth0-provider" data-config={JSON.stringify(props)}>
      {children}
    </div>
  ),
}))

import { Auth0ProviderWithConfig } from './Auth0ProviderWithConfig'

describe('Auth0ProviderWithConfig', () => {
  // Each test resets the env so others don't leak the missing-var case.
  const originalEnv = { ...import.meta.env }
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', 'tenant.auth0.local')
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'client-id-xyz')
    vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://api.test.local')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    Object.assign(import.meta.env, originalEnv)
  })

  it('forwards domain, client id and audience to Auth0Provider', async () => {
    // Re-import after stubbing so the module-level reads pick up the new values.
    vi.resetModules()
    const { Auth0ProviderWithConfig: Reimported } = await import('./Auth0ProviderWithConfig')
    render(
      <MemoryRouter>
        <Reimported>
          <div>app</div>
        </Reimported>
      </MemoryRouter>,
    )
    const provider = screen.getByTestId('auth0-provider')
    const config = JSON.parse(provider.dataset.config)
    expect(config.domain).toBe('tenant.auth0.local')
    expect(config.clientId).toBe('client-id-xyz')
    expect(config.authorizationParams.audience).toBe('https://api.test.local')
    expect(config.cacheLocation).toBe('memory')
    expect(config.useRefreshTokens).toBe(true)
  })

  it('throws when any VITE_AUTH0_* env var is missing', async () => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', '')
    vi.resetModules()
    const { Auth0ProviderWithConfig: Reimported } = await import('./Auth0ProviderWithConfig')
    expect(() =>
      render(
        <MemoryRouter>
          <Reimported>
            <div>app</div>
          </Reimported>
        </MemoryRouter>,
      ),
    ).toThrow(/Auth0 misconfigured/)
  })

  // The provider renders its children verbatim so the rest of the app
  // stays mounted; smoke-checking that here too.
  it('renders the wrapped children', async () => {
    vi.resetModules()
    const { Auth0ProviderWithConfig: Reimported } = await import('./Auth0ProviderWithConfig')
    render(
      <MemoryRouter>
        <Reimported>
          <div>nested-app</div>
        </Reimported>
      </MemoryRouter>,
    )
    expect(screen.getByText('nested-app')).toBeInTheDocument()
  })
})
