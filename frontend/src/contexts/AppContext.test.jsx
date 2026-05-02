import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApp } from './useApp'
import { AppProvider } from './AppContext'

function Probe() {
  const { isAuthenticated, userRole, displayName, currentUserId, authToken } = useApp()

  return (
    <div>
      <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
      <span data-testid="role">{userRole}</span>
      <span data-testid="name">{String(displayName)}</span>
      <span data-testid="user-id">{String(currentUserId)}</span>
      <span data-testid="token">{String(authToken)}</span>
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

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('AppProvider', () => {
  it('uses organizer simulation values when enabled', () => {
    vi.stubEnv('VITE_SIMULATE_ORGANIZER_AUTH', 'true')
    vi.stubEnv('VITE_SIMULATE_STUDENT_AUTH', 'false')

    renderProvider()

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('role')).toHaveTextContent('ORGANIZER')
    expect(screen.getByTestId('name')).toHaveTextContent('Association Demo')
    expect(screen.getByTestId('user-id')).toHaveTextContent('organizer-demo-1')
    expect(screen.getByTestId('token')).toHaveTextContent('dev-organizer-token')
  })

  it('forces logged out visitor in dev when both simulations are disabled and no token', () => {
    vi.stubEnv('VITE_SIMULATE_ORGANIZER_AUTH', 'false')
    vi.stubEnv('VITE_SIMULATE_STUDENT_AUTH', 'false')

    renderProvider()

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('name')).toHaveTextContent('Visiteur')
    expect(screen.getByTestId('user-id')).toHaveTextContent('null')
    expect(screen.getByTestId('token')).toHaveTextContent('null')
  })

  it('uses student simulation defaults when enabled without real token', () => {
    vi.stubEnv('VITE_SIMULATE_ORGANIZER_AUTH', 'false')
    vi.stubEnv('VITE_SIMULATE_STUDENT_AUTH', 'true')

    renderProvider()

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('role')).toHaveTextContent('STUDENT')
    expect(screen.getByTestId('name')).toHaveTextContent('Etudiant Demo')
    expect(screen.getByTestId('user-id')).toHaveTextContent('student-demo-1')
    expect(screen.getByTestId('token')).toHaveTextContent('dev-student-token')
  })

  it('hydrates current user from API when token exists', async () => {
    vi.stubEnv('VITE_SIMULATE_ORGANIZER_AUTH', 'false')
    vi.stubEnv('VITE_SIMULATE_STUDENT_AUTH', 'false')
    window.localStorage.setItem('auth_token', 'real-token')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-api-1', name: 'Nina', role: 'organizer' }),
    })

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent('ORGANIZER')
    })

    expect(screen.getByTestId('name')).toHaveTextContent('Nina')
    expect(screen.getByTestId('user-id')).toHaveTextContent('user-api-1')
    expect(window.localStorage.getItem('current_user_id')).toBe('user-api-1')
    expect(window.localStorage.getItem('display_name')).toBe('Nina')
    expect(window.localStorage.getItem('user_role')).toBe('ORGANIZER')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/users/me', {
      headers: { Authorization: 'Bearer real-token' },
    })
  })

  it('keeps local values when /me responds with non-ok status', async () => {
    vi.stubEnv('VITE_SIMULATE_ORGANIZER_AUTH', 'false')
    vi.stubEnv('VITE_SIMULATE_STUDENT_AUTH', 'false')
    window.localStorage.setItem('auth_token', 'real-token')
    window.localStorage.setItem('display_name', 'Initial Name')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ id: 'ignored' }),
    })

    renderProvider()

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    expect(screen.getByTestId('name')).toHaveTextContent('Initial Name')
    expect(window.localStorage.getItem('current_user_id')).toBeNull()
  })

  it('keeps existing values when fetch throws', async () => {
    vi.stubEnv('VITE_SIMULATE_ORGANIZER_AUTH', 'false')
    vi.stubEnv('VITE_SIMULATE_STUDENT_AUTH', 'false')
    window.localStorage.setItem('auth_token', 'real-token')
    window.localStorage.setItem('display_name', 'Stored Name')

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    renderProvider()

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled()
    })

    expect(screen.getByTestId('name')).toHaveTextContent('Stored Name')
    expect(screen.getByTestId('token')).toHaveTextContent('real-token')
  })
})
