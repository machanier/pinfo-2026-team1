// src/contexts/AppContext.jsx
import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { AppContext } from './AppContextValue'
import { setupAuth0Interceptor } from '../lib/api'
import { setApiTokenGetter } from '../lib/apiClient'

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

  // État local pour les données indépendantes d'Auth0
  const [savedEvents, setSavedEvents] = useState([])

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
  }, [auth0Logout])

  // Mapping des données
  const displayName = auth0User?.name || auth0User?.email || 'User'
  const userEmail = auth0User?.email || null
  const userId = auth0User?.sub || null
  const rawRole = Array.isArray(auth0User?.[ROLES_CLAIM])
    ? auth0User[ROLES_CLAIM][0]
    : auth0User?.[ROLES_CLAIM]
  const userRole = rawRole ? String(rawRole).toUpperCase() : 'STUDENT'

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: auth0IsAuthenticated,
        isLoading: auth0Loading,
        user: auth0User,
        displayName,
        userEmail,
        userId,
        userRole,
        currentUserId: userId,
        savedEvents,
        setSavedEvents,
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
