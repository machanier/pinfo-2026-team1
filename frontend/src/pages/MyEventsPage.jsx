import { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppContext } from '../contexts/AppContextValue'
import { fetchEvents, deleteEvent } from '../lib/apiServices'

const STATUS_LABELS = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CANCELLED: 'Annulé',
}

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function MyEventsPage() {
  const { userRole, isAuthenticated, isLoading: authLoading } = useContext(AppContext)
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState(null) // event to confirm deletion
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    data,
    isLoading: eventsLoading,
    error,
  } = useQuery({
    queryKey: ['myEvents'],
    queryFn: () => fetchEvents({ size: 50 }),
    enabled: !authLoading && isAuthenticated,
  })

  const loading = authLoading || eventsLoading
  const events = isAuthenticated && !authLoading ? (data?.content ?? []) : []

  function canDelete() {
    return userRole === 'ORGANIZER' || userRole === 'ADMIN'
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    setIsDeleting(true)
    try {
      await deleteEvent(deleteTarget.eventId)
      queryClient.setQueryData(['myEvents'], (old) => ({
        ...old,
        content: (old?.content ?? []).filter((e) => e.eventId !== deleteTarget.eventId),
      }))
      setDeleteTarget(null)
    } catch (err) {
      const status = err?.response?.status ?? err?.cause?.response?.status
      if (status === 403)
        setDeleteError("Accès refusé : vous n'êtes pas l'organisateur de cet événement.")
      else if (status === 409)
        setDeleteError(err.message || 'Impossible de supprimer : des inscriptions existent.')
      else setDeleteError(err.message || 'Une erreur est survenue lors de la suppression.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-confirm-title" className="text-lg font-semibold text-gray-900">
              Supprimer l&apos;événement
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Voulez-vous vraiment supprimer{' '}
              <span className="font-medium">&laquo;{deleteTarget.title}&raquo;</span> ? Cette action
              est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mes événements</h1>
          {(userRole === 'ORGANIZER' || userRole === 'ADMIN') && (
            <Link
              to="/events/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Nouvel événement
            </Link>
          )}
        </div>

        {loading && <p className="text-gray-500">Chargement…</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
            {error.message}
          </div>
        )}

        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
            {deleteError}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-gray-500">Aucun événement pour l'instant.</p>
        )}

        {!loading && events.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Titre</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Catégorie</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Lieu</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {events.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{event.title}</td>
                    <td className="px-4 py-3 text-gray-600">{event.category ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{event.place}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {event.time
                        ? new Date(event.time).toLocaleDateString('fr-CH', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_LABELS[event.status] ?? event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <Link
                        to={`/events/${event.eventId}`}
                        className="text-blue-600 hover:underline"
                      >
                        Voir
                      </Link>
                      {(userRole === 'ORGANIZER' || userRole === 'ADMIN') && (
                        <Link
                          to={`/events/edit/${event.eventId}`}
                          className="text-gray-600 hover:underline"
                        >
                          Modifier
                        </Link>
                      )}
                      {canDelete() && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(event)}
                          className="text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
