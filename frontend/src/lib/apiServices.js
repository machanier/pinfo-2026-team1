// src/lib/apiServices.js
/**
 * Fonctions de service pour communiquer avec le backend
 *
 * Ce module contient les fonctions métier qui utilisent la configuration Axios
 * avec Auth0. Chaque fonction gère les erreurs de manière appropriée et
 * formate les données pour le frontend.
 *
 * Utilisation:
 *   import { fetchUserProfile, pingBackend } from '@/lib/apiServices'
 *
 *   try {
 *     const profile = await fetchUserProfile()
 *     console.log(profile)
 *   } catch (error) {
 *     console.error('Erreur:', error)
 *   }
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiClient } from './api'

// ============================================================================
// UTILISATEURS
// ============================================================================

/**
 * Récupère le profil utilisateur depuis le backend
 * Route: GET /api/users/profile
 *
 * @returns {Promise<Object>} - Le profil utilisateur
 *   Structure attendue: { id, email, displayName, role, avatar, createdAt }
 *
 * @throws {Error} - Si l'utilisateur n'est pas authentifié (401) ou autre erreur
 *
 * @example
 *   try {
 *     const profile = await fetchUserProfile()
 *     console.log('Profil:', profile)
 *   } catch (error) {
 *     if (error.response?.status === 401) {
 *       console.error('Authentification requise')
 *     } else {
 *       console.error('Erreur:', error.message)
 *     }
 *   }
 */
export const fetchUserProfile = async () => {
  console.log('[API] Récupération du profil utilisateur...')

  try {
    const profile = await apiGet('/api/users/me')
    console.log('[API] Profil utilisateur récupéré:', profile)
    return profile
  } catch (error) {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (status === 401) {
      console.error('[API] Erreur 401: Token invalide ou expiré')
      throw new Error('Token invalide. Veuillez vous reconnecter.', { cause: error })
    }

    if (status === 403) {
      console.error('[API] Erreur 403: Accès refusé au profil')
      throw new Error('Accès refusé à votre profil.', { cause: error })
    }

    if (status === 404) {
      console.error('[API] Erreur 404: Profil utilisateur non trouvé')
      throw new Error('Profil utilisateur non trouvé.', { cause: error })
    }

    console.error('[API] Erreur lors de la récupération du profil:', error)
    throw new Error(message || 'Impossible de récupérer votre profil.', { cause: error })
  }
}

/**
 * Mise à jour du profil utilisateur
 * Route: PUT /api/users/profile
 *
 * @param {Object} updates - Les champs à mettre à jour
 *   Exemple: { displayName: 'John Doe', avatar: 'url' }
 *
 * @returns {Promise<Object>} - Le profil mis à jour
 *
 * @throws {Error} - Si la mise à jour échoue
 *
 * @example
 *   try {
 *     const updated = await updateUserProfile({ displayName: 'Jane Doe' })
 *     console.log('Profil mis à jour:', updated)
 *   } catch (error) {
 *     console.error('Erreur:', error.message)
 *   }
 */
export const updateUserProfile = async (userId, updates = {}) => {
  if (!updates || Object.keys(updates).length === 0) {
    console.warn('[API] Aucune mise à jour fournie')
    return null
  }

  console.log('[API] Mise à jour du profil avec:', updates)

  try {
    const updated = await apiPut(`/api/users/${userId}`, updates)
    console.log('[API] Profil mis à jour:', updated)
    return updated
  } catch (error) {
    console.error('[API] Erreur lors de la mise à jour du profil:', error)
    throw new Error('Impossible de mettre à jour votre profil.', { cause: error })
  }
}

/**
 * Suppression (soft delete) d'un compte utilisateur
 * Route: DELETE /api/users/{userId}
 *
 * @param {string} userId - L'ID de l'utilisateur à supprimer
 * @returns {Promise<void>}
 * @throws {Error} - 403 si non propriétaire/admin, 404 si introuvable
 */
export const deleteUser = async (userId) => {
  if (!userId) throw new Error('userId est requis')
  try {
    await apiDelete(`/api/users/${userId}`)
  } catch (error) {
    const status = error.response?.status
    if (status === 403) throw new Error('Vous ne pouvez pas supprimer ce compte.', { cause: error })
    if (status === 404) throw new Error('Compte introuvable.', { cause: error })
    throw new Error('Impossible de supprimer le compte.', { cause: error })
  }
}

// ============================================================================
// ÉVÉNEMENTS
// ============================================================================

/**
 * Récupère la liste des événements
 * Route: GET /api/events
 *
 * @param {Object} filters - Filtres optionnels
 *   Exemple: { page: 1, size: 20, search: 'sports' }
 *
 * @returns {Promise<Array>} - La liste des événements
 *
 * @throws {Error} - Si la requête échoue
 *
 * @example
 *   try {
 *     const events = await fetchEvents({ page: 1, size: 10 })
 *     console.log('Événements:', events)
 *   } catch (error) {
 *     console.error('Erreur:', error.message)
 *   }
 */
export const fetchEvents = async (filters = {}) => {
  console.log('[API] Récupération des événements...', filters)

  try {
    const events = await apiGet('/api/events', { params: filters })
    console.log('[API] Événements récupérés:', events)
    return events
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des événements:', error)
    throw new Error('Impossible de récupérer les événements.', { cause: error })
  }
}

/**
 * Récupère les événements publiés sans authentification.
 * Utilisé sur la page de login où l'utilisateur n'est pas encore connecté.
 * Route: GET /api/events (sans JWT — Kong laisse passer via le consumer anonyme)
 */
export const fetchPublicEvents = async (filters = {}) => {
  try {
    const response = await apiClient.get('/api/events', { params: filters })
    return response.data
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des événements publics:', error)
    throw new Error('Impossible de récupérer les événements.', { cause: error })
  }
}

/**
 * Récupère les détails d'un événement spécifique
 * Route: GET /api/events/:id
 *
 * @param {string} eventId - L'ID de l'événement
 *
 * @returns {Promise<Object>} - Les détails de l'événement
 *
 * @throws {Error} - Si l'événement n'existe pas ou autre erreur
 *
 * @example
 *   try {
 *     const event = await fetchEventDetail('event-123')
 *     console.log('Événement:', event)
 *   } catch (error) {
 *     console.error('Erreur:', error.message)
 *   }
 */
export const fetchEventDetail = async (eventId) => {
  if (!eventId) {
    throw new Error('eventId est requis')
  }

  console.log("[API] Récupération de l'événement:", eventId)

  try {
    const event = await apiGet(`/api/events/${eventId}`)
    console.log('[API] Événement récupéré:', event)
    return event
  } catch (error) {
    const status = error.response?.status

    if (status === 404) {
      throw new Error('Événement non trouvé.', { cause: error })
    }

    console.error("[API] Erreur lors de la récupération de l'événement:", error)
    throw new Error('Impossible de récupérer cet événement.', { cause: error })
  }
}

/**
 * Crée un nouvel événement
 * Route: POST /api/events
 *
 * @param {Object} eventData - Les données de l'événement
 *   Exemple: { title, description, date, location, maxAttendees }
 *
 * @returns {Promise<Object>} - L'événement créé
 *
 * @throws {Error} - Si la création échoue
 *
 * @example
 *   try {
 *     const newEvent = await createEvent({
 *       title: 'Conference',
 *       description: 'Tech conference',
 *       date: '2024-05-15',
 *       location: 'University Hall'
 *     })
 *     console.log('Événement créé:', newEvent)
 *   } catch (error) {
 *     console.error('Erreur:', error.message)
 *   }
 */
export const createEvent = async (eventData) => {
  if (!eventData) {
    throw new Error("Les données de l'événement sont requises")
  }

  console.log("[API] Création d'un événement:", eventData)

  try {
    const newEvent = await apiPost('/api/events', eventData)
    console.log('[API] Événement créé:', newEvent)
    return newEvent
  } catch (error) {
    console.error("[API] Erreur lors de la création de l'événement:", error)
    throw new Error('Impossible de créer cet événement.', { cause: error })
  }
}

export const updateEvent = async (eventId, eventData) => {
  if (!eventId) throw new Error('eventId est requis')
  const updated = await apiPut(`/api/events/${eventId}`, eventData)
  return updated
}

export const deleteEvent = async (eventId) => {
  if (!eventId) throw new Error('eventId est requis')
  await apiDelete(`/api/events/${eventId}`)
}

export const publishEvent = async (eventId) => {
  if (!eventId) throw new Error('eventId est requis')
  return await apiPatch(`/api/events/${eventId}/publish`)
}

export const cancelEvent = async (eventId, reason) => {
  if (!eventId) throw new Error('eventId est requis')
  return await apiPatch(`/api/events/${eventId}/cancel`, reason ? { reason } : {})
}

// ============================================================================
// INSCRIPTIONS
// ============================================================================

export const fetchMyRegistrations = async (filters = {}) => {
  try {
    return await apiGet('/api/registrations/me', { params: filters })
  } catch (error) {
    throw new Error('Impossible de récupérer vos inscriptions.', { cause: error })
  }
}

export const registerForEvent = async (eventId) => {
  try {
    return await apiPost('/api/registrations', { eventId })
  } catch (error) {
    const status = error.response?.status
    if (status === 409) throw new Error('Vous êtes déjà inscrit à cet événement.', { cause: error })
    if (status === 403)
      throw new Error("Vous ne remplissez pas les conditions d'accès à cet événement.", {
        cause: error,
      })
    if (status === 400)
      throw new Error('Impossible de vous inscrire à cet événement dans son état actuel.', {
        cause: error,
      })
    throw new Error('Impossible de vous inscrire à cet événement.', { cause: error })
  }
}

export const cancelRegistration = async (registrationId) => {
  try {
    await apiDelete(`/api/registrations/${registrationId}`)
  } catch (error) {
    const status = error.response?.status
    if (status === 409)
      throw new Error("Impossible d'annuler une inscription pour un événement passé.", {
        cause: error,
      })
    throw new Error("Impossible d'annuler votre inscription.", { cause: error })
  }
}

// ============================================================================
// CALENDRIER
// ============================================================================

export const fetchCalendarEvents = async ({ from, to, organizerId } = {}) => {
  try {
    const params = { from, to }
    if (organizerId) params.organizerId = organizerId
    return await apiGet('/api/events/calendar', { params })
  } catch (error) {
    throw new Error('Impossible de récupérer les événements du calendrier.', { cause: error })
  }
}

// ============================================================================
// TESTS DE CONNECTIVITÉ
// ============================================================================

/**
 * Teste la connectivité avec le backend
 * Route: GET /api/health (ou /api/ping selon votre backend)
 *
 * Cette fonction ne nécessite pas d'authentification et est utile pour:
 * - Vérifier que le backend est accessible
 * - Vérifier la latence du réseau
 * - Tester la configuration de base
 *
 * @returns {Promise<Object>} - L'état du backend
 *   Structure attendue: { status: 'ok', timestamp }
 *
 * @throws {Error} - Si le backend n'est pas accessible
 *
 * @example
 *   try {
 *     const health = await pingBackend()
 *     console.log('Backend en ligne:', health)
 *   } catch (error) {
 *     console.error('Backend indisponible:', error.message)
 *   }
 */
export const pingBackend = async () => {
  console.log('[API] Test de connectivité au backend...')

  try {
    // Essayer plusieurs endpoints possibles
    let response = null
    const endpoints = ['/q/health', '/api/health', '/health']

    for (const endpoint of endpoints) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      try {
        response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[API] Backend en ligne:', data)
          return { status: 'ok', data, endpoint }
        }
      } catch {
        // Continuer vers l'endpoint suivant
      } finally {
        clearTimeout(timeoutId)
      }
    }

    throw new Error('Aucun endpoint health trouvé')
  } catch (error) {
    console.error('[API] Backend indisponible:', error)
    throw new Error("Le backend n'est pas accessible.", { cause: error })
  }
}

/**
 * Teste l'authentification avec le backend
 * Route: GET /api/auth/test (endpoint sécurisé)
 *
 * Cette fonction teste que:
 * 1. Le token Auth0 est valide
 * 2. Le backend peut vérifier le token
 * 3. La configuration d'authentification est correcte
 *
 * @returns {Promise<Object>} - Confirmation d'authentification
 *   Structure attendue: { authenticated: true, userId, email }
 *
 * @throws {Error} - Si l'authentification échoue
 *
 * @example
 *   try {
 *     const auth = await testAuthentication()
 *     console.log('Authentification réussie:', auth)
 *   } catch (error) {
 *     if (error.response?.status === 401) {
 *       console.error('Token invalide ou expiré')
 *     } else {
 *       console.error('Erreur d\'authentification:', error.message)
 *     }
 *   }
 */
export const testAuthentication = async () => {
  console.log("[API] Test d'authentification...")

  try {
    const result = await apiGet('/api/users/me')
    console.log('[API] Authentification réussie:', result)
    return result
  } catch (error) {
    const status = error.response?.status

    if (status === 401) {
      console.error('[API] Erreur 401: Token invalide ou expiré')
      throw new Error('Token invalide. Veuillez vous reconnecter.', { cause: error })
    }

    console.error("[API] Erreur d'authentification:", error)
    throw new Error("L'authentification a échoué.", { cause: error })
  }
}

// ============================================================================
// ANNONCES D'ÉVÉNEMENT
// ============================================================================

export const fetchEventAnnouncements = async (eventId, page = 0, size = 3) => {
  if (!eventId) throw new Error('eventId est requis')
  try {
    return await apiGet(`/api/events/${eventId}/announcements`, { params: { page, size } })
  } catch (error) {
    throw new Error('Impossible de récupérer les annonces.', { cause: error })
  }
}

export const createEventAnnouncement = async (eventId, content) => {
  if (!eventId) throw new Error('eventId est requis')
  try {
    return await apiPost(`/api/events/${eventId}/announcements`, { body: content })
  } catch (error) {
    throw new Error("Impossible de publier l'annonce.", { cause: error })
  }
}

export const deleteEventAnnouncement = async (eventId, announcementId) => {
  if (!eventId || !announcementId) throw new Error('eventId et announcementId sont requis')
  try {
    return await apiDelete(`/api/events/${eventId}/announcements/${announcementId}`)
  } catch (error) {
    throw new Error("Impossible de supprimer l'annonce.", { cause: error })
  }
}

// ============================================================================
// MODÉRATION (ADMIN)
// ============================================================================

/**
 * Récupère la file de modération (cas en attente de décision admin).
 * Route: GET /api/moderation/queue  (rôle Admin requis)
 *
 * @param {Object} params - { status, page, size }
 *   status: 'PENDING' | 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED' (défaut: PENDING)
 * @returns {Promise<Object>} ModerationCasePage { content, page, size, totalElements, totalPages }
 */
export const fetchModerationQueue = async ({ status = 'PENDING', page = 0, size = 30 } = {}) => {
  try {
    return await apiGet('/api/moderation/queue', { params: { status, page, size } })
  } catch (error) {
    if (error.response?.status === 403)
      throw new Error('Accès refusé : réservé aux administrateurs.', { cause: error })
    throw new Error('Impossible de récupérer la file de modération.', { cause: error })
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Utilisateurs
  fetchUserProfile,
  updateUserProfile,
  deleteUser,

  // Événements
  fetchEvents,
  fetchEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  cancelEvent,

  // Inscriptions & Calendrier
  fetchMyRegistrations,
  registerForEvent,
  cancelRegistration,
  fetchCalendarEvents,

  // Annonces
  fetchEventAnnouncements,
  createEventAnnouncement,
  deleteEventAnnouncement,

  // Modération (admin)
  fetchModerationQueue,

  // Tests
  pingBackend,
  testAuthentication,
}
