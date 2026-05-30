import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../contexts/useApp'

// PINFO-190 — wrappers read isAuthenticated AND isLoading from
// AppContext (which derives both from useAuth0() in AppProvider).
//
// The isLoading check matters: when Auth0 redirects back to the SPA
// with `?code=…&state=…` in the URL, the SDK takes a few ms to consume
// those params and exchange the code for tokens. During that window
// isAuthenticated is still false but isLoading is true. If the route
// wrapper navigates to /login during that window, react-router replaces
// the URL and we lose the `?code=…` query params, leaving the SDK
// unable to finalize the session — the visible symptom is an infinite
// redirect loop after a successful Auth0 login (PINFO-190 hotfix).
//
// Preview/demo mode: useApp().isDemo (see src/lib/demoMode.js) injects a
// fictional session, so the guards below stay permissive and the whole
// app is navigable without logging in. Inert in production.

export function PublicOnlyRoute({ children, redirectTo = '/' }) {
  const { isAuthenticated, isLoading, isDemo } = useApp()

  if (isLoading) return null
  // In demo mode we keep the public landing reachable even though a
  // fictional session is "authenticated".
  if (isAuthenticated === true && !isDemo) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}

export function RequireAuthRoute({ children, redirectTo = '/login' }) {
  const { isAuthenticated, isLoading } = useApp()
  const location = useLocation()

  if (isLoading) return null
  if (isAuthenticated !== true) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={redirectTo} replace state={{ returnTo }} />
  }
  return children
}

export function RequireRoleRoute({ children, allowedRoles = [], redirectTo = '/' }) {
  const { userRole, isDemo } = useApp()

  // Demo mode can browse every role-gated page regardless of DEMO_ROLE.
  if (!isDemo && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
