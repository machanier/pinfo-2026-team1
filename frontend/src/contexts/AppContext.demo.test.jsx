/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useApp } from './useApp'

// setupTests.js pins DEMO_MODE off globally; override it here to exercise the
// preview/demo branches of AppProvider (fictional identity, demo logout, signInDemo).
vi.mock('../lib/demoMode', () => ({
  DEMO_MODE: true,
  DEMO_ROLE: 'ORGANIZER',
  DEMO_USER: { name: 'Camille Démo', email: 'camille.demo@etu.unige.ch' },
}))

const { useAuth0Mock } = vi.hoisted(() => ({ useAuth0Mock: vi.fn() }))
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => useAuth0Mock() }))
vi.mock('../lib/apiClient', () => ({ default: { get: vi.fn() }, setApiTokenGetter: vi.fn() }))
vi.mock('../lib/api', () => ({ setupAuth0Interceptor: vi.fn(() => vi.fn()) }))

import { AppProvider } from './AppContext'

function DemoProbe() {
  const { isDemo, isAuthenticated, displayName, userRole, signInDemo, logout } = useApp()
  return (
    <div>
      <span data-testid="isDemo">{String(isDemo)}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="name">{displayName}</span>
      <span data-testid="role">{userRole}</span>
      <button type="button" onClick={logout}>
        Logout
      </button>
      <button type="button" onClick={signInDemo}>
        SignInDemo
      </button>
    </div>
  )
}

const renderDemo = () =>
  render(
    <AppProvider>
      <DemoProbe />
    </AppProvider>,
  )

describe('AppProvider — preview/demo mode', () => {
  beforeEach(() => {
    useAuth0Mock.mockReset().mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: undefined,
      getAccessTokenSilently: vi.fn(),
      logout: vi.fn(),
      loginWithRedirect: vi.fn(),
    })
    try {
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
  })

  it('injects a fictional identity when unauthenticated', () => {
    renderDemo()
    expect(screen.getByTestId('isDemo')).toHaveTextContent('true')
    expect(screen.getByTestId('auth')).toHaveTextContent('true')
    expect(screen.getByTestId('name')).toHaveTextContent('Camille Démo')
    expect(screen.getByTestId('role')).toHaveTextContent('ORGANIZER')
  })

  it('logout drops the fictional identity without an Auth0 redirect', () => {
    const auth0Logout = vi.fn()
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: undefined,
      getAccessTokenSilently: vi.fn(),
      logout: auth0Logout,
      loginWithRedirect: vi.fn(),
    })
    renderDemo()
    expect(screen.getByTestId('name')).toHaveTextContent('Camille Démo')

    fireEvent.click(screen.getByText('Logout'))
    expect(auth0Logout).not.toHaveBeenCalled()
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
  })

  it('signInDemo restores the fictional identity after a demo logout', () => {
    renderDemo()
    fireEvent.click(screen.getByText('Logout'))
    expect(screen.getByTestId('auth')).toHaveTextContent('false')

    fireEvent.click(screen.getByText('SignInDemo'))
    expect(screen.getByTestId('name')).toHaveTextContent('Camille Démo')
    expect(screen.getByTestId('auth')).toHaveTextContent('true')
  })
})
