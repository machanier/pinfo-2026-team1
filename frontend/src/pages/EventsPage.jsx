// Dedicated search page (route /search). The home page (HomePage) is the
// chronological showcase; here we focus on deep search & filtering.
import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, Heart, X } from 'lucide-react'
import { fetchEvents } from '../lib/apiServices'
import EventCard from '../components/event/EventCard'
import { SAMPLE_EVENTS } from '../lib/sampleEvents'
import { DEMO_MODE } from '../lib/demoMode'
import { useApp } from '../contexts/useApp'
import { EVENT_CATEGORIES, categoryMatches } from '../lib/categories'

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
        active
          ? 'bg-pink-600 text-white'
          : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState('date_asc')
  const { savedEvents = [] } = useApp()
  const PAGE_SIZE = 12

  // Favoris piloté par l'URL (?fav=1) : le cœur de la navbar fonctionne de partout.
  const favOnly = searchParams.get('fav') === '1'
  const setFavOnly = (next) =>
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        if (next) sp.set('fav', '1')
        else sp.delete('fav')
        return sp
      },
      { replace: true },
    )

  const { data, isLoading, error } = useQuery({
    queryKey: ['publicEvents', page],
    queryFn: () =>
      fetchEvents({
        status: 'PUBLISHED',
        after: new Date().toISOString(),
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const realEvents = data?.content ?? []
  const events = realEvents.length === 0 && DEMO_MODE ? SAMPLE_EVENTS : realEvents
  const totalPages = data?.totalPages ?? 0

  const categories = EVENT_CATEGORIES

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = events.filter((e) => {
      if (favOnly && !savedEvents.includes(e.eventId)) return false
      if (!categoryMatches(e.category, category)) return false
      if (q && !`${e.title} ${e.description ?? ''} ${e.place ?? ''}`.toLowerCase().includes(q))
        return false
      return true
    })
    return [...list].sort((a, b) =>
      sort === 'date_desc'
        ? new Date(b.time) - new Date(a.time)
        : new Date(a.time) - new Date(b.time),
    )
  }, [events, search, category, favOnly, savedEvents, sort])

  const hasFilters = Boolean(search || category || favOnly)
  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setFavOnly(false)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Rechercher un événement</h1>
      <p className="text-gray-500 mb-4">Filtre par mot-clé, catégorie ou favoris.</p>

      {/* Barre d'outils (reste visible au défilement) */}
      <div className="sticky top-0 z-10 -mx-6 mb-3 border-b border-gray-100 bg-gray-50/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un événement…"
              autoFocus
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-pink-400 focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-pink-400 focus:outline-none"
          >
            <option value="date_asc">Date croissante</option>
            <option value="date_desc">Date décroissante</option>
          </select>
          <button
            type="button"
            onClick={() => setFavOnly(!favOnly)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              favOnly
                ? 'border-pink-300 bg-pink-50 text-pink-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart className={`h-4 w-4 ${favOnly ? 'fill-pink-600 text-pink-600' : ''}`} />
            Favoris
          </button>
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={!category} onClick={() => setCategory('')}>
              Toutes
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(category === c ? '' : c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {/* Compteur + effacer */}
      {!isLoading && !error && events.length > 0 && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {filtered.length} événement{filtered.length > 1 ? 's' : ''}
            {hasFilters ? (filtered.length > 1 ? ' trouvés' : ' trouvé') : ''}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 font-medium text-pink-600 hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Effacer les filtres
            </button>
          )}
        </div>
      )}

      {isLoading && events.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm animate-pulse"
            >
              <div className="h-40 w-full bg-gray-100" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
                <div className="h-3 w-2/3 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && events.length === 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">
          Impossible de charger les événements. Veuillez réessayer.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <p className="text-gray-500">
          {hasFilters
            ? 'Aucun événement ne correspond à ta recherche.'
            : 'Aucun événement publié pour le moment.'}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
            <EventCard key={event.eventId} event={event} to={`/events/${event.eventId}`} />
          ))}
        </div>
      )}

      {totalPages > 1 && !hasFilters && (
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
