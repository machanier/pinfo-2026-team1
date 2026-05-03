// src/contexts/AppContext.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { AppContext } from './AppContextValue'
import { setupAuth0Interceptor } from '../lib/api'

export const AppProvider = ({ children }) => {
  const navigate = useNavigate()
  const {
    isLoading: auth0Loading,
    isAuthenticated: auth0IsAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()

  // État local pour certaines données qui ne viennent pas directement d'Auth0
  const [savedEvents, setSavedEvents] = useState([])
  const [accessToken, setAccessToken] = useState(null)
  const [tokenError, setTokenError] = useState(null)
  const [isLoadingToken, setIsLoadingToken] = useState(false)

  /**
   * Initialise l'interceptor Auth0 au montage
   * L'interceptor attache automatiquement le Bearer token à toutes les requêtes
   */
  useEffect(() => {
    try {
      setupAuth0Interceptor(getAccessTokenSilently)
      console.log('[AppContext] Interceptor Auth0 initialisé')
    } catch (error) {
      console.error("[AppContext] Erreur lors de l'initialisation de l'interceptor:", error)
    }
  }, [getAccessTokenSilently])

  /**
   * Récupère le token JWT depuis Auth0 de manière silencieuse
   * Le token est automatiquement rafraîchi si expiré
   * @returns {string|null} - Le JWT token ou null si erreur
   */
  const getToken = useCallback(async () => {
    if (!auth0IsAuthenticated) {
      console.warn('[AppContext] Tentative de get token sans authentification')
      return null
    }

    try {
      setIsLoadingToken(true)
      setTokenError(null)

      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
        },
      })

      setAccessToken(token)
      return token
    } catch (error) {
      const errorMessage = error.error || error.message || 'Erreur lors de la récupération du token'
      console.error('[AppContext] Erreur getToken:', errorMessage)
      setTokenError(errorMessage)

      // Si le token est invalide ou expiré, proposer une reconnexion
      if (error.error === 'invalid_grant' || error.error === 'access_denied') {
        console.warn('[AppContext] Token invalide/expiré, redirection vers login')
        loginWithRedirect()
      }

      return null
    } finally {
      setIsLoadingToken(false)
    }
  }, [auth0IsAuthenticated, getAccessTokenSilently, loginWithRedirect])

  /**
   * Récupère le token à intervalles réguliers pour le maintenir valide
   * (Refresh du token avant expiration)
   */
  useEffect(() => {
    if (!auth0IsAuthenticated) return

    // Récupérer le token immédiatement après authentification
    getToken()

    // Mettre à jour le token tous les 5 minutes (avant expiration)
    const tokenRefreshInterval = setInterval(
      () => {
        getToken()
      },
      5 * 60 * 1000,
    ) // 5 minutes

    return () => clearInterval(tokenRefreshInterval)
  }, [auth0IsAuthenticated, getToken])

  /**
   * Fonction login: Utilise Auth0 loginWithRedirect
   * Redirige vers la page Auth0 pour l'authentification
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
   * Fonction logout: Utilise Auth0 logout
   * Efface la session Auth0 et les données locales
   * Résout PINFO-17 et PINFO-19: Logout + Invalidation de session
   */
  const logout = useCallback(() => {
    try {
      // Effacer les données locales
      setSavedEvents([])
      setAccessToken(null)
      setTokenError(null)

      console.log('[AppContext] Utilisateur déconnecté')

      // Logout Auth0 avec redirection
      auth0Logout({
        logoutParams: {
          returnTo: `${window.location.origin}/`,
        },
      })
    } catch (error) {
      console.error('[AppContext] Erreur lors du logout:', error)
    }
  }, [auth0Logout])

  /**
   * Mapper les données Auth0 vers les propriétés de l'AppContext
   * Préserve la compatibilité avec les composants existants
   */
  const displayName = auth0User?.name || auth0User?.email || 'User'
  const userEmail = auth0User?.email || null
  const userId = auth0User?.sub || null // 'sub' est l'ID unique dans Auth0

  // Déterminer le rôle depuis Auth0 (custom claim)
  // Assurez-vous d'avoir ajouté ce claim dans votre configuration Auth0
  const userRole = auth0User?.['https://pinfo.unige.ch/role'] || 'STUDENT'

  return (
    <AppContext.Provider
      value={{
        // État - Authentification (mappé depuis Auth0)
        isAuthenticated: auth0IsAuthenticated,
        isLoading: auth0Loading || isLoadingToken,
        user: auth0User,

        // État - User Info
        displayName,
        userEmail,
        userId,
        userRole,

        // État - Token
        accessToken,
        tokenError,

        // État - Local
        savedEvents,
        setSavedEvents,

        // Fonctions d'authentification
        login,
        logout,
        getToken,

        // Auth0 hooks (pour accès direct si nécessaire)
        auth0: {
          loginWithRedirect,
          getAccessTokenSilently,
        },
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
