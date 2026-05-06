import { useEffect, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AppContext } from '../contexts/AppContextValue'
import { fetchEvents } from '../lib/apiServices'

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
  const { userRole, currentUserId } = useContext(AppContext)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!currentUserId) return
    fetchEvents({ organizerId: currentUserId, size: 50 })
      .then((data) => {
        setEvents(data?.content ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [currentUserId])

  return (
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
          {error}
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
                    <Link to={`/events/${event.eventId}`} className="text-blue-600 hover:underline">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
