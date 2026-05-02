import { Navigate } from 'react-router-dom'
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

export function PublicOnlyRoute({ children, redirectTo = '/' }) {
  const { isAuthenticated, isLoading } = useApp()

  if (isLoading) return null
  if (isAuthenticated === true) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}

export function RequireAuthRoute({ children, redirectTo = '/login' }) {
  const { isAuthenticated, isLoading } = useApp()

  if (isLoading) return null
  if (isAuthenticated !== true) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}

export function RequireRoleRoute({ children, allowedRoles = [], redirectTo = '/' }) {
  const { userRole } = useApp()

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
