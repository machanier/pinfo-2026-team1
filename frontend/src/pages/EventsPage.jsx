import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchEvents } from '../lib/apiServices'

export default function EventsPage() {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const { data, isLoading, error } = useQuery({
    queryKey: ['publicEvents', page],
    queryFn: () =>
      fetchEvents({
        status: 'PUBLISHED',
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const events = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Événements à venir</h1>
      <p className="text-gray-500 mb-6">Découvrez les prochains événements de l&apos;université.</p>

      {/* État de chargement */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-5 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">
          Impossible de charger les événements. Veuillez réessayer.
        </div>
      )}

      {/* Aucun résultat */}
      {!isLoading && !error && events.length === 0 && (
        <p className="text-gray-500">Aucun événement publié pour le moment.</p>
      )}

      {/* Grille d'événements */}
      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              key={event.eventId}
              to={`/events/${event.eventId}`}
              className="group rounded-xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-pink-200 transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-pink-600 line-clamp-2">
                  {event.title}
                </h2>
                {event.category && (
                  <span className="shrink-0 rounded-full bg-pink-50 text-pink-600 px-2 py-0.5 text-xs font-medium">
                    {event.category}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-500">
                {event.place && (
                  <p className="flex items-center gap-1">
                    <span>📍</span> {event.place}
                  </p>
                )}
                {event.time && (
                  <p className="flex items-center gap-1">
                    <span>🗓</span>{' '}
                    {new Date(event.time).toLocaleDateString('fr-CH', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {event.capacity && (
                  <p className="flex items-center gap-1">
                    <span>👥</span> {event.capacity} places
                  </p>
                )}
              </div>

              {event.description && (
                <p className="mt-3 text-sm text-gray-600 line-clamp-2">{event.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Précédent
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  )
}
