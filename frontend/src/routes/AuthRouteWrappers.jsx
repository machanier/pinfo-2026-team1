import { Navigate } from 'react-router-dom'
import { useApp } from '../contexts/useApp'

// PINFO-190 — wrappers now read isAuthenticated from AppContext, which
// itself derives that flag from useAuth0() in AppProvider. The route
// guards therefore reflect Auth0's real session state instead of a
// local React boolean a user could flip from DevTools. The shape of
// useApp() is unchanged so existing tests still inject AppContext
// directly without having to mock @auth0/auth0-react.

export function PublicOnlyRoute({ children, redirectTo = '/' }) {
  const { isAuthenticated } = useApp()

  if (isAuthenticated === true) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export function RequireAuthRoute({ children, redirectTo = '/login' }) {
  const { isAuthenticated } = useApp()

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
