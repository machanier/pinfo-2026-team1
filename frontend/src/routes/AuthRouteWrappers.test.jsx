import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import { PublicOnlyRoute, RequireAuthRoute, RequireRoleRoute } from './AuthRouteWrappers'

function renderWithRouterAndContext({
  initialPath,
  contextValue,
  guardedElement,
  guardedPath = '/guarded',
  fallbackPath = '/fallback',
}) {
  return render(
    <AppContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={guardedPath} element={guardedElement} />
          <Route path={fallbackPath} element={<div>Fallback page</div>} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>,
  )
}

describe('AuthRouteWrappers', () => {
  function LoginSink() {
    const location = useLocation()
    return <div>{location.state?.returnTo ?? 'no-return-to'}</div>
  }

  it('PublicOnlyRoute redirects authenticated users', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: true, userRole: 'STUDENT' },
      guardedElement: (
        <PublicOnlyRoute redirectTo="/fallback">
          <div>Public content</div>
        </PublicOnlyRoute>
      ),
    })

    expect(screen.getByText('Fallback page')).toBeInTheDocument()
    expect(screen.queryByText('Public content')).not.toBeInTheDocument()
  })

  it('PublicOnlyRoute renders children for unauthenticated users', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: false, userRole: 'STUDENT' },
      guardedElement: (
        <PublicOnlyRoute redirectTo="/fallback">
          <div>Public content</div>
        </PublicOnlyRoute>
      ),
    })

    expect(screen.getByText('Public content')).toBeInTheDocument()
    expect(screen.queryByText('Fallback page')).not.toBeInTheDocument()
  })

  it('PublicOnlyRoute renders children when authentication state is undefined', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: undefined, userRole: 'STUDENT' },
      guardedElement: (
        <PublicOnlyRoute redirectTo="/fallback">
          <div>Public content</div>
        </PublicOnlyRoute>
      ),
    })

    expect(screen.getByText('Public content')).toBeInTheDocument()
    expect(screen.queryByText('Fallback page')).not.toBeInTheDocument()
  })

  it('RequireAuthRoute redirects unauthenticated users', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: false, userRole: 'STUDENT' },
      guardedElement: (
        <RequireAuthRoute redirectTo="/fallback">
          <div>Private content</div>
        </RequireAuthRoute>
      ),
    })

    expect(screen.getByText('Fallback page')).toBeInTheDocument()
    expect(screen.queryByText('Private content')).not.toBeInTheDocument()
  })

  it('RequireAuthRoute forwards the original location in redirect state', () => {
    render(
      <AppContext.Provider
        value={{ isAuthenticated: false, isLoading: false, userRole: 'STUDENT' }}
      >
        <MemoryRouter initialEntries={['/guarded?tab=1']}>
          <Routes>
            <Route
              path="/guarded"
              element={
                <RequireAuthRoute redirectTo="/login">
                  <div>Private content</div>
                </RequireAuthRoute>
              }
            />
            <Route path="/login" element={<LoginSink />} />
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    expect(screen.getByText('/guarded?tab=1')).toBeInTheDocument()
  })

  it('RequireAuthRoute redirects users when authentication state is undefined', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: undefined, userRole: 'STUDENT' },
      guardedElement: (
        <RequireAuthRoute redirectTo="/fallback">
          <div>Private content</div>
        </RequireAuthRoute>
      ),
    })

    expect(screen.getByText('Fallback page')).toBeInTheDocument()
    expect(screen.queryByText('Private content')).not.toBeInTheDocument()
  })

  it('RequireAuthRoute renders children for authenticated users', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: true, userRole: 'STUDENT' },
      guardedElement: (
        <RequireAuthRoute redirectTo="/fallback">
          <div>Private content</div>
        </RequireAuthRoute>
      ),
    })

    expect(screen.getByText('Private content')).toBeInTheDocument()
    expect(screen.queryByText('Fallback page')).not.toBeInTheDocument()
  })

  it('RequireRoleRoute redirects when role is not allowed', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: true, userRole: 'STUDENT' },
      guardedElement: (
        <RequireRoleRoute allowedRoles={['ORGANIZER']} redirectTo="/fallback">
          <div>Organizer content</div>
        </RequireRoleRoute>
      ),
    })

    expect(screen.getByText('Fallback page')).toBeInTheDocument()
    expect(screen.queryByText('Organizer content')).not.toBeInTheDocument()
  })

  it('RequireRoleRoute renders children when role is allowed', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: true, userRole: 'ORGANIZER' },
      guardedElement: (
        <RequireRoleRoute allowedRoles={['ORGANIZER']} redirectTo="/fallback">
          <div>Organizer content</div>
        </RequireRoleRoute>
      ),
    })

    expect(screen.getByText('Organizer content')).toBeInTheDocument()
    expect(screen.queryByText('Fallback page')).not.toBeInTheDocument()
  })

  it('PublicOnlyRoute renders nothing while loading', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: false, isLoading: true, userRole: 'STUDENT' },
      guardedElement: (
        <PublicOnlyRoute redirectTo="/fallback">
          <div>Public content</div>
        </PublicOnlyRoute>
      ),
    })

    expect(screen.queryByText('Public content')).not.toBeInTheDocument()
    expect(screen.queryByText('Fallback page')).not.toBeInTheDocument()
  })

  it('RequireAuthRoute renders nothing while loading', () => {
    renderWithRouterAndContext({
      initialPath: '/guarded',
      contextValue: { isAuthenticated: false, isLoading: true, userRole: 'STUDENT' },
      guardedElement: (
        <RequireAuthRoute redirectTo="/fallback">
          <div>Private content</div>
        </RequireAuthRoute>
      ),
    })

    expect(screen.queryByText('Private content')).not.toBeInTheDocument()
    expect(screen.queryByText('Fallback page')).not.toBeInTheDocument()
  })
})
