import { Navigate } from 'react-router-dom'
import { useApp } from '../contexts/useApp'

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
