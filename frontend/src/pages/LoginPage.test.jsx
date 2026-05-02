/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
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
  })

  it('triggers Auth0 hosted login when not authenticated and not loading', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      loginWithRedirect,
    })
    render(<LoginPage />)
    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Redirection/)).toBeInTheDocument()
  })

  it('does not trigger login while Auth0 is still resolving the session', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      loginWithRedirect,
    })
    render(<LoginPage />)
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })

  it('does not trigger login when the user is already authenticated', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      loginWithRedirect,
    })
    render(<LoginPage />)
    expect(loginWithRedirect).not.toHaveBeenCalled()
  })
})
