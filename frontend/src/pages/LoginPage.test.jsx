/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { loginWithRedirect, useAuth0Mock } = vi.hoisted(() => {
  const loginFn = vi.fn()
  return {
    loginWithRedirect: loginFn,
    useAuth0Mock: vi.fn(),
  }
})

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => useAuth0Mock(),
}))

import LoginPage from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH0_AUDIENCE', 'test-aud')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    sessionStorage.clear()
  })

  it('calls loginWithRedirect when the login button is clicked', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Se connecter avec Auth0/i }))
    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
    expect(loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({
          audience: 'test-aud',
          scope: 'openid profile email',
        }),
      }),
    )
  })

  it('renders a loading screen when Auth0 is loading', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      error: null,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument()
  })
})
