// src/hooks/useApi.js
/**
 * Hook personnalisé: useApi
 *
 * Facilite les requêtes API authentifiées avec gestion d'état
 * (loading, error, data)
 *
 * Utilisation:
 *   const { data, error, isLoading, execute } = useApi()
 *
 *   // Appeler manuellement une requête
 *   const handleClick = async () => {
 *     try {
 *       const result = await execute('GET', '/api/users/profile')
 *       console.log(result)
 *     } catch (err) {
 *       console.error(err)
 *     }
 *   }
 *
 *   // Ou utiliser useEffect pour appeler au montage
 *   useEffect(() => {
 *     execute('GET', '/api/users/profile')
 *   }, [])
 */

import { useState, useCallback, useEffect } from 'react'
import { apiAuthClient } from '../lib/api'
import { useApp } from '../contexts/useApp'

/**
 * Hook pour faire des requêtes API authentifiées
 * @param {Object} options - Configuration optionnelle
 * @param {string} options.method - Méthode HTTP par défaut ('GET', 'POST', 'PUT', 'DELETE')
 * @param {string} options.endpoint - Endpoint par défaut
 * @param {boolean} options.autoFetch - Déclencher la requête au montage si endpoint est fourni
 * @returns {Object} - { data, error, isLoading, execute, reset }
 */
export const useApi = (options = {}) => {
  const { autoFetch = false, method: defaultMethod = 'GET', endpoint: defaultEndpoint } = options
  const { getToken } = useApp()

  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Exécute une requête API
   * @param {string} method - Méthode HTTP
   * @param {string} endpoint - Endpoint relatif
   * @param {Object} payload - Les données à envoyer (pour POST/PUT)
   * @param {Object} requestOptions - Options Axios additionnelles
   * @returns {Promise<Object>} - Les données de réponse
   */
  const execute = useCallback(
    async (
      method = defaultMethod,
      endpoint = defaultEndpoint,
      payload = null,
      requestOptions = {},
    ) => {
      if (!endpoint) {
        throw new Error('[useApi] endpoint est requis')
      }

      setIsLoading(true)
      setError(null)

      try {
        // Assurer que le token est disponible
        const token = await getToken()
        if (!token) {
          throw new Error("Token d'authentification indisponible")
        }

        // Préparer la config de la requête
        const config = {
          method,
          url: endpoint,
          ...requestOptions,
        }

        // Ajouter le Bearer token manuellement (l'interceptor devrait aussi le faire)
        if (!config.headers) {
          config.headers = {}
        }
        config.headers.Authorization = `Bearer ${token}`

        // Ajouter les données pour POST/PUT
        if ((method === 'POST' || method === 'PUT') && payload) {
          config.data = payload
        }

        // Afficher les logs en développement
        if (import.meta.env.DEV) {
          console.debug(`[useApi] ${method} ${endpoint}`, payload)
        }

        // Exécuter la requête
        const response = await apiAuthClient(config)

        setData(response.data)
        return response.data
      } catch (err) {
        // Formatter le message d'erreur
        const errorMessage = err.response?.data?.message || err.message || 'Erreur API inconnue'
        const errorDetails = {
          message: errorMessage,
          status: err.response?.status,
          endpoint,
          method,
        }

        console.error('[useApi] Erreur:', errorDetails)
        setError(errorDetails)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [defaultMethod, defaultEndpoint, getToken],
  )

  /**
   * Réinitialiser l'état
   */
  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  /**
   * Déclencher la requête au montage si autoFetch est true
   */
  useEffect(() => {
    if (autoFetch && defaultEndpoint && defaultMethod === 'GET') {
      const timeoutId = setTimeout(() => {
        void execute(defaultMethod, defaultEndpoint)
      }, 0)

      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [autoFetch, defaultEndpoint, defaultMethod, execute])

  return {
    data,
    error,
    isLoading,
    execute,
    reset,
  }
}

export default useApi
