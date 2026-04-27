import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
})
