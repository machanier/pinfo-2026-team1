/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

  it('calls loginWithRedirect with signup hint when signup button is clicked', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Créer un compte avec Auth0/i }))
    expect(loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({
          audience: 'test-aud',
          scope: 'openid profile email',
          screen_hint: 'signup',
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

  it('shows Auth0 error feedback when authentication fails', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: { message: 'Auth0 panne' },
      loginWithRedirect,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Erreur: Auth0 panne/i)).toBeInTheDocument()
  })

  it('shows info feedback when code and state are present', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })

    render(
      <MemoryRouter initialEntries={['/login?code=abc&state=xyz']}>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Traitement de votre authentification/i)).toBeInTheDocument()
  })

  it('redirects to /profile after successful authentication', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<div>Profile landing</div>} />
        </Routes>
      </MemoryRouter>,
    )

    // The page redirects immediately (no timeout) when already authenticated.
    expect(screen.getByText('Profile landing')).toBeInTheDocument()
  })
})
