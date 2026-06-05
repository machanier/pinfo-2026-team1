import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  fetchNotificationPreferences,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotificationPreferences,
} from '../lib/apiServices'

/**
 * Récupère et met à jour en temps réel le nombre de notifications non lues.
 * Utilisable dans Navbar ou n'importe quel composant.
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
    // La pastille ne fabrique JAMAIS de compteur : elle reflète la réalité. Sur
    // erreur transitoire (cold start, token pas encore prêt après un vidage de
    // cache, blip réseau) React Query conserve la dernière valeur connue ; avant
    // le premier succès `data` est undefined → 0 → pas de pastille.
    data: query.data ?? 0,
  }
}

/**
 * Hook principal pour la page de notifications.
 * Gère le chargement, le filtrage, et les mutations (mark as read).
 * Sur erreur backend, expose `isError` : la page affiche un état d'erreur réel
 * (plus aucune donnée de démonstration).
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
    markRead: (id) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
  }
}

/**
 * Hook pour les préférences de notification.
 * Sur erreur backend, expose `isError` : la page affiche un état d'erreur réel.
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
    update: (prefs) => updateMutation.mutate(prefs),
    isUpdating: updateMutation.isPending,
    isUpdateSuccess: updateMutation.isSuccess,
    updateError: updateMutation.error,
  }
}
