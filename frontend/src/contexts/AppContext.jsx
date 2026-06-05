// src/contexts/AppContext.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { AppContext } from './AppContextValue'
import { setupAuth0Interceptor } from '../lib/api'
import api, { setApiTokenGetter } from '../lib/apiClient'
import { DEMO_MODE, DEMO_ROLE, DEMO_USER } from '../lib/demoMode'

// Must match the namespace used by the Auth0 Action and the backend
// (smallrye.jwt.path.groups / CustomSecurityAugmentor)
const ROLES_CLAIM = 'https://unigevents.com/roles'
const isDev = import.meta.env.DEV

export const AppProvider = ({ children }) => {
  const {
    isLoading: auth0Loading,
    isAuthenticated: auth0IsAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()

  // État local pour les données indépendantes d'Auth0.
  // Favoris persistés en localStorage (pas d'endpoint backend dédié pour l'instant).
  const [savedEvents, setSavedEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedEvents') || '[]')
    } catch {
      return []
    }
  })

  const toggleFavorite = useCallback((eventId) => {
    setSavedEvents((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
      try {
        localStorage.setItem('savedEvents', JSON.stringify(next))
      } catch {
        /* ignore storage errors */
      }
      return next
    })
  }, [])

  const isFavorite = useCallback((eventId) => savedEvents.includes(eventId), [savedEvents])

  // Mode aperçu : permet de « se déconnecter » pour prévisualiser la vue
  // visiteur anonyme (sessionStorage, réinitialisé à la fermeture de l'onglet).
  const [demoSignedOut, setDemoSignedOut] = useState(() => {
    try {
      return sessionStorage.getItem('demoSignedOut') === '1'
    } catch {
      return false
    }
  })

  // Backend UUID for the current user (different from auth0User.sub)
  const [backendUserId, setBackendUserId] = useState(null)

  /**
   * Fetch the backend UUID once the user is authenticated.
   * auth0User.sub is the Auth0 subject (e.g. "auth0|abc") and does NOT
   * match the UUID stored in the backend — we need the real UUID for
   * route comparisons like routeId === currentUserId.
   */
  useEffect(() => {
    if (!auth0IsAuthenticated || !auth0User) {
      return
    }
    api
      .get('/api/users/me')
      .then((res) => setBackendUserId(res.data?.id ?? null))
      .catch(() => setBackendUserId(null))
  }, [auth0IsAuthenticated, auth0User])

  /**
   * Initialise l'interceptor Auth0 au montage
   * C'est lui (et uniquement lui) qui appellera getAccessTokenSilently à la volée !
   */
  useEffect(() => {
    let cleanupInterceptor = null

    try {
      setApiTokenGetter(() =>
        getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            scope: 'openid profile email',
          },
        }),
      )
      cleanupInterceptor = setupAuth0Interceptor(getAccessTokenSilently)
      if (isDev) {
        console.log('[AppContext] Interceptor Auth0 initialisé')
      }
    } catch (error) {
      console.error("[AppContext] Erreur lors de l'initialisation de l'interceptor:", error)
    }

    return () => {
      if (typeof cleanupInterceptor === 'function') {
        cleanupInterceptor()
      }
    }
  }, [getAccessTokenSilently])

  /**
   * Fonction login
   */
  const login = useCallback(
    async (options = {}) => {
      try {
        await loginWithRedirect({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            scope: 'openid profile email',
          },
          ...options,
        })
      } catch (error) {
        console.error('[AppContext] Erreur lors du login:', error)
        throw error
      }
    },
    [loginWithRedirect],
  )

  /**
   * Fonction logout
   */
  const logout = useCallback(() => {
    try {
      setSavedEvents([])
      // En mode aperçu (pas de vraie session Auth0), « se déconnecter » bascule
      // vers la vue visiteur anonyme — sans redirection Auth0.
      if (DEMO_MODE && !auth0IsAuthenticated) {
        try {
          sessionStorage.setItem('demoSignedOut', '1')
        } catch {
          /* ignore storage errors */
        }
        setDemoSignedOut(true)
        return
      }
      if (isDev) {
        console.log('[AppContext] Utilisateur déconnecté')
      }

      auth0Logout({
        logoutParams: {
          returnTo: window.location.origin, // Plus propre sans le '/'
        },
      })
    } catch (error) {
      console.error('[AppContext] Erreur lors du logout:', error)
    }
  }, [auth0Logout, auth0IsAuthenticated])

  // Reconnexion fictive en mode aperçu.
  const signInDemo = useCallback(() => {
    try {
      sessionStorage.removeItem('demoSignedOut')
    } catch {
      /* ignore storage errors */
    }
    setDemoSignedOut(false)
  }, [])

  // ── Mode aperçu (preview) ───────────────────────────────────────────
  // En dev local ou sur un build de preview (VITE_DEMO_MODE=true), on
  // fabrique une identité fictive pour que l'équipe puisse naviguer tout
  // le site SANS se connecter. En prod (DEMO_MODE faux) ce bloc est inerte.
  const isDemo = DEMO_MODE && !auth0IsAuthenticated && !auth0Loading
  // Identité fictive active seulement si on n'a pas « quitté » la démo.
  const isDemoIdentity = isDemo && !demoSignedOut

  // Mapping des données
  const displayName =
    auth0User?.name || auth0User?.email || (isDemoIdentity ? DEMO_USER.name : 'User')
  const userEmail = auth0User?.email || (isDemoIdentity ? DEMO_USER.email : null)
  const userId = auth0User?.sub || (isDemoIdentity ? 'demo-user' : null)
  // Roles are emitted as an array by Auth0 Actions; normalise to an
  // uppercase string so guards like allowedRoles.includes(userRole) work.
  const rawRole = auth0User?.[ROLES_CLAIM]
  const userRole = isDemoIdentity
    ? DEMO_ROLE
    : (Array.isArray(rawRole) ? rawRole[0] : rawRole)?.toUpperCase() || 'STUDENT'

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: auth0IsAuthenticated || isDemoIdentity,
        isDemo,
        isDemoIdentity,
        signInDemo,
        isLoading: auth0Loading,
        user: auth0User,
        displayName,
        userEmail,
        userId,
        userRole,
        currentUserId: backendUserId,
        savedEvents,
        setSavedEvents,
        toggleFavorite,
        isFavorite,
        login,
        logout,
        // On expose la fonction directement pour les cas très spécifiques
        getToken: getAccessTokenSilently,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
