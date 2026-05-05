/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApp } from './useApp'

// Hoisted mocks so the factory can reference them and the tests can
// drive them.
const { useAuth0Mock } = vi.hoisted(() => ({
  useAuth0Mock: vi.fn(),
}))

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => useAuth0Mock(),
}))

vi.mock('../lib/apiClient', () => ({
  setApiTokenGetter: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  setupAuth0Interceptor: vi.fn(() => vi.fn()),
}))

import { AppProvider } from './AppContext'
import { setupAuth0Interceptor } from '../lib/api'
import { setApiTokenGetter } from '../lib/apiClient'

function Probe() {
  const {
    isAuthenticated,
    userRole,
    displayName,
    currentUserId,
    savedEvents,
    setSavedEvents,
    logout,
  } = useApp()
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="role">{userRole}</span>
      <span data-testid="name">{displayName}</span>
      <span data-testid="uid">{currentUserId ?? '(null)'}</span>
      <span data-testid="saved">{String(savedEvents.length)}</span>
      <button type="button" onClick={() => setSavedEvents(['a'])}>
        Seed
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <AppProvider>
      <Probe />
    </AppProvider>,
  )
}

function renderProviderWithLogin(onReady) {
  function LoginProbe() {
    const { login } = useApp()
    const onReadyRef = useRef(onReady)

    useEffect(() => {
      onReadyRef.current(login)
    }, [login])
    return null
  }

  return render(
    <AppProvider>
      <LoginProbe />
    </AppProvider>,
  )
}

describe('AppProvider', () => {
  beforeEach(() => {
    useAuth0Mock.mockReset()
    setupAuth0Interceptor.mockReset().mockReturnValue(vi.fn())
  })
  afterEach(() => vi.clearAllMocks())

  it('exposes Auth0 claims from the token', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        name: 'Alice From Token',
        email: 'alice@unige.ch',
        sub: 'auth0|123',
        'https://pinfo.unige.ch/role': 'ORGANIZER',
      },
      getAccessTokenSilently: vi.fn(),
      logout: vi.fn(),
      loginWithRedirect: vi.fn(),
    })

    renderProvider()
    expect(screen.getByTestId('auth')).toHaveTextContent('true')
    expect(screen.getByTestId('role')).toHaveTextContent('ORGANIZER')
    expect(screen.getByTestId('name')).toHaveTextContent('Alice From Token')
    expect(screen.getByTestId('uid')).toHaveTextContent('auth0|123')
  })

  it('defaults to STUDENT when the role claim is missing', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Roleless User' },
      getAccessTokenSilently: vi.fn(),
      logout: vi.fn(),
      loginWithRedirect: vi.fn(),
    })
    renderProvider()
    expect(screen.getByTestId('role')).toHaveTextContent('STUDENT')
  })

  it('does not call /api/users/me when the user is unauthenticated', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: undefined,
      getAccessTokenSilently: vi.fn(),
      logout: vi.fn(),
      loginWithRedirect: vi.fn(),
    })

    renderProvider()
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
    expect(screen.getByTestId('uid')).toHaveTextContent('(null)')
  })

  it('logout clears savedEvents and calls auth0Logout', () => {
    const auth0Logout = vi.fn()
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Token Name', 'https://pinfo.unige.ch/role': 'STUDENT' },
      getAccessTokenSilently: vi.fn(),
      logout: auth0Logout,
      loginWithRedirect: vi.fn(),
    })

    renderProvider()
    fireEvent.click(screen.getByText('Seed'))
    expect(screen.getByTestId('saved')).toHaveTextContent('1')

    fireEvent.click(screen.getByText('Logout'))
    expect(auth0Logout).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('saved')).toHaveTextContent('0')
  })

  it('login surfaces errors from Auth0', async () => {
    const loginWithRedirect = vi.fn().mockRejectedValue(new Error('login failed'))
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      getAccessTokenSilently: vi.fn(),
      logout: vi.fn(),
      loginWithRedirect,
    })

    let loginFn
    renderProviderWithLogin((fn) => {
      loginFn = fn
    })

    await expect(loginFn({ prompt: 'login' })).rejects.toThrow('login failed')
  })

  it('cleans up the Auth0 interceptor on unmount', () => {
    const cleanupMock = vi.fn()
    setupAuth0Interceptor.mockReturnValueOnce(cleanupMock)
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      getAccessTokenSilently: vi.fn(),
      logout: vi.fn(),
      loginWithRedirect: vi.fn(),
    })

    const { unmount } = renderProvider()
    expect(setApiTokenGetter).toHaveBeenCalledTimes(1)

    unmount()
    expect(cleanupMock).toHaveBeenCalledTimes(1)
  })
})
