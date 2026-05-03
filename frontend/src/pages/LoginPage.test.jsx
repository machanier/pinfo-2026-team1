/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  afterEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('triggers Auth0 hosted login when not authenticated and not loading', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
    expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: '/' } })
    expect(screen.getByText(/Redirection/)).toBeInTheDocument()
  })

  it('does not trigger login while Auth0 is still resolving the session', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })

  it('does not trigger login when the user is already authenticated', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })

  it('forwards returnTo from router state to Auth0 appState', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { returnTo: '/profile' } }]}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: '/profile' } })
  })

  it('avoids a second immediate redirect when a redirect lock already exists', () => {
    sessionStorage.setItem('auth0:login_redirect_started_at', String(Date.now()))
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect,
    })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })
})
