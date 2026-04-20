// src/contexts/AppContext.jsx
import { useEffect, useState } from 'react'
import { AppContext } from './AppContextValue'

export const AppProvider = ({ children }) => {
  const simulateOrganizerAuth =
    String(import.meta.env.VITE_SIMULATE_ORGANIZER_AUTH || 'false').toLowerCase() === 'true'

  const simulateStudentAuth =
    String(import.meta.env.VITE_SIMULATE_STUDENT_AUTH || 'true').toLowerCase() === 'true'

  const getBrowserStorageValue = (key) => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key)
  }

  const storedToken = getBrowserStorageValue('auth_token') || getBrowserStorageValue('access_token')
  const hasRealToken = Boolean(storedToken)

  const forceLoggedOutInDev =
    import.meta.env.DEV && !simulateOrganizerAuth && !simulateStudentAuth && !storedToken

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (simulateOrganizerAuth) {
      return true
    }

    if (forceLoggedOutInDev) {
      return false
    }

    return Boolean(storedToken) || simulateStudentAuth
  })
  const [userRole, setUserRole] = useState(() => {
    if (simulateOrganizerAuth) {
      return 'ORGANIZER'
    }

    return getBrowserStorageValue('user_role') || 'STUDENT'
  })
  const [displayName, setDisplayName] = useState(
    () =>
      (forceLoggedOutInDev ? 'Visiteur' : null) ||
      (simulateOrganizerAuth ? 'Association Demo' : null) ||
      getBrowserStorageValue('display_name') ||
      (simulateStudentAuth && !hasRealToken ? 'Etudiant Demo' : 'Student Test'),
  )
  const [savedEvents, setSavedEvents] = useState([])
  const [currentUserId, setCurrentUserId] = useState(() => {
    if (forceLoggedOutInDev) {
      return null
    }

    return (
      (simulateOrganizerAuth ? 'organizer-demo-1' : null) ||
      getBrowserStorageValue('current_user_id') ||
      (simulateStudentAuth && !hasRealToken ? 'student-demo-1' : null)
    )
  })
  const [authToken, setAuthToken] = useState(() => {
    if (forceLoggedOutInDev) {
      return null
    }

    return (
      (simulateOrganizerAuth ? 'dev-organizer-token' : null) ||
      storedToken ||
      (simulateStudentAuth && !hasRealToken ? 'dev-student-token' : null)
    )
  })

  useEffect(() => {
    const shouldHydrateFromApi = Boolean(storedToken) && !simulateOrganizerAuth

    if (!shouldHydrateFromApi) {
      return
    }

    let cancelled = false

    const hydrateCurrentUser = async () => {
      try {
        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })

        if (!response.ok) {
          return
        }

        const me = await response.json()
        if (cancelled || !me?.id) {
          return
        }

        setCurrentUserId(me.id)
        setDisplayName(me.name || 'Student Test')
        if (me.role) {
          setUserRole(String(me.role).toUpperCase())
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('current_user_id', me.id)
          if (me.name) {
            window.localStorage.setItem('display_name', me.name)
          }
          if (me.role) {
            window.localStorage.setItem('user_role', String(me.role).toUpperCase())
          }
        }
      } catch {
        // Keep existing local values when backend is unavailable.
      }
    }

    void hydrateCurrentUser()

    return () => {
      cancelled = true
    }
  }, [simulateOrganizerAuth, storedToken])

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        userRole,
        setUserRole,
        displayName,
        setDisplayName,
        savedEvents,
        setSavedEvents,
        currentUserId,
        setCurrentUserId,
        authToken,
        setAuthToken,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
