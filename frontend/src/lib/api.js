// src/lib/api.js
/**
 * Configuration Axios pour l'intégration Auth0
 *
 * Ce module configure un client Axios qui:
 * 1. Attache automatiquement le JWT token Auth0 à chaque requête sortante
 * 2. Gère les erreurs d'authentification (401, 403)
 * 3. Renouvelle les tokens automatiquement en cas d'expiration
 * 4. Loggue les requêtes API pour le debugging
 *
 * Utilisation:
 *   import { apiClient } from '@/lib/api'
 *   const data = await apiClient.get('/api/users/profile')
 */

import axios from 'axios'

// ============================================================================
// Configuration de base
// ============================================================================

/**
 * URL de base du backend
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081'

/**
 * Timeout par défaut pour les requêtes (30 secondes)
 */
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')

/**
 * Instance Axios basique (sans interceptors)
 * Utile pour les requêtes non authentifiées
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Instance Axios avec support Auth0
 * À utiliser pour les requêtes authentifiées
 */
export const apiAuthClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================================
// Interceptor pour les requêtes authentifiées
// ============================================================================

/**
 * Variable globale pour stocker la fonction getAccessTokenSilently d'Auth0
 * Initialisée via setupAuth0Interceptor()
 */
let getAccessTokenSilentlyFn = null

/**
 * Initialise l'interceptor d'authentification
 * À appeler une seule fois au démarrage de l'app (recommandé dans AppProvider)
 *
 * @param {Function} getAccessTokenSilently - Fonction Auth0 pour obtenir le token JWT
 */
export const setupAuth0Interceptor = (getAccessTokenSilently) => {
  if (!getAccessTokenSilently) {
    console.error('[API] setupAuth0Interceptor: getAccessTokenSilently est requis')
    return
  }

  getAccessTokenSilentlyFn = getAccessTokenSilently

  // Interceptor de requête: attache le token JWT
  apiAuthClient.interceptors.request.use(
    async (config) => {
      try {
        // Obtenir le token JWT depuis Auth0
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            scope: 'openid profile email',
          },
        })

        // Attacher le token dans le header Authorization
        config.headers.Authorization = `Bearer ${token}`

        // Logger la requête (optionnel, utile pour le debugging)
        console.debug(`[API] ${config.method.toUpperCase()} ${config.url}`)

        return config
      } catch (error) {
        console.error('[API] Erreur lors de la récupération du token:', error)
        // Retourner la config quand même pour laisser la requête échouer proprement
        return config
      }
    },
    (error) => {
      console.error("[API] Erreur dans l'interceptor de requête:", error)
      return Promise.reject(error)
    },
  )

  // Interceptor de réponse: gère les erreurs d'authentification
  apiAuthClient.interceptors.response.use(
    (response) => {
      // Si tout va bien, retourner la réponse
      return response
    },
    async (error) => {
      const config = error.config

      // =====================================================================
      // Gestion des erreurs 401 (Unauthorized) et 403 (Forbidden)
      // =====================================================================

      if (error.response?.status === 401) {
        console.warn('[API] 401 Unauthorized - Token invalide ou expiré')
        // Note: Auth0 gère automatiquement le refresh des tokens
        // Si on reçoit quand même un 401, c'est une erreur réelle
        // Vous pouvez ici rediriger vers le login ou afficher une notification
      }

      if (error.response?.status === 403) {
        console.warn('[API] 403 Forbidden - Accès refusé')
        // L'utilisateur n'a pas les permissions nécessaires
      }

      // =====================================================================
      // Logging d'erreur formaté
      // =====================================================================

      const errorMessage = error.response?.data?.message || error.message || 'Erreur API inconnue'

      console.error('[API] Erreur de réponse:', {
        status: error.response?.status,
        message: errorMessage,
        url: config?.url,
        method: config?.method?.toUpperCase(),
      })

      // Retourner l'erreur rejetée
      return Promise.reject(error)
    },
  )

  console.log('[API] Interceptor Auth0 initialisé avec succès')
}

// ============================================================================
// Fonctions utilitaires pour les requêtes API
// ============================================================================

/**
 * Fonction GET sécurisée
 * @param {string} endpoint - L'endpoint relatif (ex: '/api/users/profile')
 * @param {Object} options - Options additionnelles (headers, params, etc)
 * @returns {Promise<Object>} - Les données de la réponse
 */
export const apiGet = async (endpoint, options = {}) => {
  try {
    const response = await apiAuthClient.get(endpoint, options)
    return response.data
  } catch (error) {
    console.error(`[API] GET ${endpoint} échoué:`, error)
    throw error
  }
}

/**
 * Fonction POST sécurisée
 * @param {string} endpoint - L'endpoint relatif
 * @param {Object} data - Les données à envoyer
 * @param {Object} options - Options additionnelles
 * @returns {Promise<Object>} - Les données de la réponse
 */
export const apiPost = async (endpoint, data = {}, options = {}) => {
  try {
    const response = await apiAuthClient.post(endpoint, data, options)
    return response.data
  } catch (error) {
    console.error(`[API] POST ${endpoint} échoué:`, error)
    throw error
  }
}

/**
 * Fonction PUT sécurisée
 * @param {string} endpoint - L'endpoint relatif
 * @param {Object} data - Les données à envoyer
 * @param {Object} options - Options additionnelles
 * @returns {Promise<Object>} - Les données de la réponse
 */
export const apiPut = async (endpoint, data = {}, options = {}) => {
  try {
    const response = await apiAuthClient.put(endpoint, data, options)
    return response.data
  } catch (error) {
    console.error(`[API] PUT ${endpoint} échoué:`, error)
    throw error
  }
}

/**
 * Fonction DELETE sécurisée
 * @param {string} endpoint - L'endpoint relatif
 * @param {Object} options - Options additionnelles
 * @returns {Promise<Object>} - Les données de la réponse
 */
export const apiDelete = async (endpoint, options = {}) => {
  try {
    const response = await apiAuthClient.delete(endpoint, options)
    return response.data
  } catch (error) {
    console.error(`[API] DELETE ${endpoint} échoué:`, error)
    throw error
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  apiClient,
  apiAuthClient,
  setupAuth0Interceptor,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
}
