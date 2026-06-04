import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { fetchEventDetail } from '../lib/apiServices'
import EventCard from '../components/event/EventCard'
import { useApp } from '../contexts/useApp'

// Dedicated « Mes favoris » view (route /favorites — the navbar heart links here).
// Favourites are stored client-side as a list of event ids (AppContext.savedEvents,
// localStorage-backed), so we resolve each one to a full event the same way
// MyEventsPage resolves registrations — by id, in parallel. This replaces routing
// /favorites to the legacy EventsPage, which rendered the old search screen.
export default function FavoritesPage() {
  const { savedEvents = [] } = useApp()

  const queries = useQueries({
    queries: savedEvents.map((id) => ({
      queryKey: ['event', id],
      queryFn: () => fetchEventDetail(id),
      retry: false,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  // Drop favourites whose event no longer exists (deleted → 404 → no data).
  const events = queries.map((q) => q.data).filter(Boolean)

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <Heart className="h-5 w-5 fill-pink-600" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
          <p className="text-sm text-gray-500">
            {savedEvents.length === 0
              ? 'Ajoute des événements avec le cœur pour les retrouver ici.'
              : `${events.length} événement${events.length > 1 ? 's' : ''} enregistré${
                  events.length > 1 ? 's' : ''
                }.`}
          </p>
        </div>
      </header>

      {savedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <Heart className="mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-1 text-lg font-semibold text-gray-700">Ta liste de favoris est vide</h2>
          <p className="mb-6 max-w-sm text-sm text-gray-500">
            Parcours les événements et appuie sur le cœur pour les ajouter à tes favoris.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
          >
            Explorer les événements
          </Link>
        </div>
      ) : isLoading && events.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(savedEvents.length, 6) }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm animate-pulse"
            >
              <div className="h-44 w-full bg-gray-100" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="rounded-lg border border-gray-100 bg-white p-6 text-sm text-gray-500">
          Tes événements favoris ne sont plus disponibles (supprimés ou terminés).
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.eventId} event={event} to={`/events/${event.eventId}`} />
          ))}
        </div>
      )}
    </div>
  )
}
