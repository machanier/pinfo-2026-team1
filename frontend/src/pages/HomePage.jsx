import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Search,
  ArrowRight,
  CalendarDays,
  MapPin,
  Mic,
  Trophy,
  Mountain,
  Briefcase,
  Sparkles,
  Music,
  Tag,
} from 'lucide-react'
import { fetchEvents } from '../lib/apiServices'
import EventCard from '../components/event/EventCard'
import { SAMPLE_EVENTS } from '../lib/sampleEvents'
import { DEMO_MODE } from '../lib/demoMode'
import { EVENT_CATEGORIES } from '../lib/categories'

const CATEGORY_ICONS = {
  Conférence: Mic,
  Sport: Trophy,
  'Plein air': Mountain,
  Carrière: Briefcase,
  'Bien-être': Sparkles,
  Musique: Music,
}
const catIcon = (c) => CATEGORY_ICONS[c] || Tag

const fmtDate = (t) =>
  new Date(t).toLocaleDateString('fr-CH', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function HomePage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['publicEvents', 0],
    queryFn: () =>
      fetchEvents({ status: 'PUBLISHED', after: new Date().toISOString(), page: 0, size: 12 }),
    placeholderData: keepPreviousData,
  })

  const realEvents = data?.content ?? []
  const events = realEvents.length === 0 && DEMO_MODE ? SAMPLE_EVENTS : realEvents

  const upcoming = useMemo(
    () => [...events].sort((a, b) => new Date(a.time) - new Date(b.time)),
    [events],
  )
  const featured = upcoming[0]
  const rest = upcoming.slice(1)
  const categories = EVENT_CATEGORIES

  const submitSearch = (e) => {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Accroche + recherche */}
      <section>
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Qu&apos;est-ce qui t&apos;intéresse aujourd&apos;hui&nbsp;?
        </h1>
        <p className="mt-1 text-gray-500">
          Découvre et inscris-toi aux événements de l&apos;Université de Genève.
        </p>
        <form onSubmit={submitSearch} className="mt-5 flex max-w-2xl gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un événement, une catégorie…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-pink-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-pink-700"
          >
            Rechercher
          </button>
        </form>
      </section>

      {/* À la une */}
      {featured && (
        <section>
          <Link
            to={`/events/${featured.eventId}`}
            className="group relative block overflow-hidden rounded-2xl shadow-sm"
          >
            <div className="relative h-72 bg-gray-100 sm:h-80">
              {featured.bannerImageUrl || featured.bannerUrl ? (
                <img
                  src={featured.bannerImageUrl || featured.bannerUrl}
                  alt={`Bannière – ${featured.title}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-pink-500 to-pink-700" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  À la une{featured.category ? ` · ${featured.category}` : ''}
                </span>
                <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight sm:text-3xl">
                  {featured.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
                  {featured.time && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      {fmtDate(featured.time)}
                    </span>
                  )}
                  {featured.place && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {featured.place}
                    </span>
                  )}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-pink-700">
                  Voir l&apos;événement <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Catégories */}
      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900">Parcourir par catégorie</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => {
              const Icon = catIcon(c)
              return (
                <Link
                  key={c}
                  to={`/search?category=${encodeURIComponent(c)}`}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-pink-600">
                    {c}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Prochains événements */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold text-gray-900">Prochains événements</h2>
          <Link
            to="/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:underline"
          >
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

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

        {!isLoading && !error && upcoming.length === 0 && (
          <p className="text-gray-500">Aucun événement publié pour le moment.</p>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((event) => (
              <EventCard key={event.eventId} event={event} to={`/events/${event.eventId}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
