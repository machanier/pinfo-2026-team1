/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApp } from './useApp'

// Hoisted mocks so the factory can reference them and the tests can
// drive them.
const { useAuth0Mock, apiGet } = vi.hoisted(() => ({
  useAuth0Mock: vi.fn(),
  apiGet: vi.fn(),
}))

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => useAuth0Mock(),
}))

vi.mock('../auth/apiClient', () => ({
  useApiClient: () => ({ get: apiGet }),
}))

vi.mock('../lib/apiClient', () => ({
  setApiTokenGetter: vi.fn(),
}))

import { AppProvider } from './AppContext'

function Probe() {
  const { isAuthenticated, userRole, displayName, currentUserId } = useApp()
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="role">{userRole}</span>
      <span data-testid="name">{displayName}</span>
      <span data-testid="uid">{currentUserId ?? '(null)'}</span>
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

describe('AppProvider', () => {
  beforeEach(() => {
    apiGet.mockReset()
    useAuth0Mock.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  it('exposes Auth0 claims when no /api/users/me data has arrived', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        name: 'Alice From Token',
        'https://unigevents.com/roles': ['Organizer'],
      },
      getAccessTokenSilently: vi.fn(),
    })
    apiGet.mockReturnValue(new Promise(() => {})) // never resolves

    renderProvider()
    expect(screen.getByTestId('auth')).toHaveTextContent('true')
    expect(screen.getByTestId('role')).toHaveTextContent('ORGANIZER')
    expect(screen.getByTestId('name')).toHaveTextContent('Alice From Token')
    expect(screen.getByTestId('uid')).toHaveTextContent('(null)')
  })

  it('overrides claims with /api/users/me data once the call resolves', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Token Name', 'https://unigevents.com/roles': ['Student'] },
      getAccessTokenSilently: vi.fn(),
    })
    apiGet.mockResolvedValue({
      data: { id: 'uuid-1', name: 'DB Name', role: 'admin' },
    })

    renderProvider()
    await waitFor(() => {
      expect(screen.getByTestId('uid')).toHaveTextContent('uuid-1')
    })
    expect(screen.getByTestId('name')).toHaveTextContent('DB Name')
    expect(screen.getByTestId('role')).toHaveTextContent('ADMIN')
  })

  it('falls back to Auth0 claims when /api/users/me fails', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Token Name', 'https://unigevents.com/roles': ['Student'] },
      getAccessTokenSilently: vi.fn(),
    })
    apiGet.mockRejectedValue(new Error('boom'))

    renderProvider()
    // Wait long enough for the rejected promise to settle without crashing.
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalled()
    })
    // Claims still surface as fallback.
    expect(screen.getByTestId('name')).toHaveTextContent('Token Name')
    expect(screen.getByTestId('role')).toHaveTextContent('STUDENT')
  })

  it('defaults to STUDENT when the role claim is missing', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Roleless User' }, // no roles claim
      getAccessTokenSilently: vi.fn(),
    })
    apiGet.mockReturnValue(new Promise(() => {}))

    renderProvider()
    expect(screen.getByTestId('role')).toHaveTextContent('STUDENT')
  })

  it('does not call /api/users/me when the user is unauthenticated', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: undefined,
      getAccessTokenSilently: vi.fn(),
    })

    renderProvider()
    expect(apiGet).not.toHaveBeenCalled()
    expect(screen.getByTestId('auth')).toHaveTextContent('false')
    expect(screen.getByTestId('uid')).toHaveTextContent('(null)')
  })

  it('ignores a /api/users/me response that lacks an id', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { name: 'Token Name', 'https://unigevents.com/roles': ['Student'] },
      getAccessTokenSilently: vi.fn(),
    })
    apiGet.mockResolvedValue({ data: { name: 'No ID Here' } })

    renderProvider()
    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    // currentUserId stays null, name stays as the token claim.
    expect(screen.getByTestId('uid')).toHaveTextContent('(null)')
    expect(screen.getByTestId('name')).toHaveTextContent('Token Name')
  })
})
