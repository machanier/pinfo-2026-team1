import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  fetchNotificationPreferences,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
} from '../lib/apiServices'

// ---------------------------------------------------------------------------
// Mock data — utilisé quand le notification-service est indisponible
// ---------------------------------------------------------------------------

const now = new Date()
const ago = (minutes) => new Date(now - minutes * 60 * 1000).toISOString()

export const MOCK_NOTIFICATIONS = {
  content: [
    {
      notificationId: 'mock-1',
      type: 'REGISTRATION_CONFIRMED',
      body: 'Ta place pour « Hackathon UNIGE 2026 » est confirmée. À bientôt !',
      read: false,
      createdAt: ago(45),
      eventId: 'demo-hackathon-2026',
    },
    {
      notificationId: 'mock-2',
      type: 'ANNOUNCEMENT',
      body: "L'Orchestre Universitaire vient de publier un nouvel événement : Concert de fin d'année.",
      read: false,
      createdAt: ago(180),
      eventId: 'demo-concert-fin-annee',
    },
    {
      notificationId: 'mock-3',
      type: 'REMINDER',
      body: "« Randonnée au Salève » commence dans 24 h. Pense à t'équiper !",
      read: false,
      createdAt: ago(360),
      eventId: 'demo-randonnee-saleve',
    },
    {
      notificationId: 'mock-4',
      type: 'EVENT_UPDATED',
      body: '« Conférence : IA et société » change de salle — désormais en Auditoire U600.',
      read: true,
      createdAt: ago(1440),
      eventId: 'demo-conf-ia-societe',
    },
    {
      notificationId: 'mock-5',
      type: 'WAITLIST_PROMOTED',
      body: "Une place s'est libérée pour « Tournoi inter-facultés de volleyball » — tu es inscrit·e !",
      read: true,
      createdAt: ago(2880),
      eventId: 'demo-tournoi-volley',
    },
    {
      notificationId: 'mock-6',
      type: 'SLOT_AVAILABLE',
      body: 'Une place vient de se libérer sur « Workshop Design Thinking ». Inscris-toi vite !',
      read: true,
      createdAt: ago(4320),
      eventId: 'demo-workshop-design',
    },
  ],
  page: 0,
  size: 30,
  totalElements: 6,
  totalPages: 1,
  unreadCount: 3,
}

export const MOCK_PREFERENCES = {
  emailEnabled: true,
  emailOnAnnouncement: true,
  emailOnEventUpdate: true,
  emailOnEventCancellation: true,
  emailOnRegistrationConfirmed: true,
  emailOnFreeSlot: false,
  reminderLeadTimeHours: 24,
}

/**
 * Récupère et met à jour en temps réel le nombre de notifications non lues.
 * Utilisable dans Navbar ou n'importe quel composant.
 * Retourne 0 silencieusement si le service est indisponible.
 */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadNotificationsCount,
    refetchInterval: 60_000,
    retry: false,
    select: (data) => data?.count ?? 0,
  })
  return {
    ...query,
    // Service indisponible → on affiche le compteur de démonstration, pour rester
    // cohérent avec la liste (qui bascule aussi sur MOCK_NOTIFICATIONS).
    data: query.isError ? MOCK_NOTIFICATIONS.unreadCount : (query.data ?? 0),
    isError: false,
    isMock: query.isError,
  }
}

/**
 * Hook principal pour la page de notifications.
 * Gère le chargement, le filtrage, et les mutations (mark as read).
 * En cas d'erreur backend, bascule sur des données mockées (isMock: true).
 *
 * @param {Object} filters
 * @param {boolean|undefined} filters.read - Filtrer par statut lu/non-lu
 * @param {string|undefined}  filters.type - Filtrer par type (NotificationType)
 * @param {number}            filters.page - Numéro de page (0-indexé)
 * @param {number}            filters.size - Taille de page
 */
export function useNotifications({ read, type, page = 0, size = 30 } = {}) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  }

  const query = useQuery({
    queryKey: ['notifications', { read, type, page, size }],
    queryFn: () => fetchNotifications({ read, type, page, size }),
    retry: false,
  })

  // Filtrage local du mock selon l'onglet actif
  const mockData = (() => {
    if (!query.isError) return null
    let content = MOCK_NOTIFICATIONS.content
    if (read === true) content = content.filter((n) => n.read)
    if (read === false) content = content.filter((n) => !n.read)
    return { ...MOCK_NOTIFICATIONS, content, totalElements: content.length }
  })()

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: invalidate,
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidate,
  })

  return {
    ...query,
    // Quand le backend est down : données mock, pas d'erreur affichée
    data: query.isError ? mockData : query.data,
    isError: false,
    error: null,
    isMock: query.isError,
    markRead: (id) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
  }
}

/**
 * Hook pour les préférences de notification.
 * Bascule sur des valeurs par défaut mockées si le service est indisponible.
 */
export function useNotificationPreferences() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-preferences'], data)
    },
  })

  return {
    ...query,
    data: query.isError ? MOCK_PREFERENCES : query.data,
    isError: false,
    // On nettoie l'erreur résiduelle : la page préférences affiche alors le
    // formulaire en mode démo (bandeau « isMock ») au lieu d'une erreur dure.
    error: null,
    isMock: query.isError,
    update: (prefs) => updateMutation.mutate(prefs),
    isUpdating: updateMutation.isPending,
    isUpdateSuccess: updateMutation.isSuccess,
    updateError: updateMutation.error,
  }
}
