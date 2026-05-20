import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchOrganizers } from '../lib/apiServices'

const PAGE_SIZE = 12

function OrganizerCard({ organizer }) {
  const initial = organizer.associationName
    ? organizer.associationName.charAt(0).toUpperCase()
    : '?'

  return (
    <Link
      to={`/organizers/${organizer.userId}`}
      className="group flex flex-col rounded-xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-pink-200 transition-shadow"
    >
      <div className="flex items-center gap-4 mb-3">
        {organizer.logoUrl ? (
          <img
            src={organizer.logoUrl}
            alt={organizer.associationName}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xl font-bold shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-pink-600 truncate">
              {organizer.associationName || 'Association sans nom'}
            </h2>
            {organizer.verified && (
              <span className="shrink-0 rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-xs font-medium">
                ✓ Vérifié
              </span>
            )}
          </div>
          {organizer.upcomingEventCount > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {organizer.upcomingEventCount} événement
              {organizer.upcomingEventCount > 1 ? 's' : ''} à venir
            </p>
          )}
        </div>
      </div>

      {organizer.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mt-auto">{organizer.description}</p>
      )}
    </Link>
  )
}

export default function OrganizersPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, error } = useQuery({
    queryKey: ['organizers', debouncedSearch, page],
    queryFn: () =>
      fetchOrganizers({
        q: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const organizers = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Organisateurs</h1>
      <p className="text-gray-500 mb-6">
        Découvrez les associations et organisateurs d&apos;événements de l&apos;université.
      </p>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une association…"
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-5 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mt-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">
          Impossible de charger les organisateurs. Veuillez réessayer.
        </div>
      )}

      {/* Aucun résultat */}
      {!isLoading && !error && organizers.length === 0 && (
        <p className="text-gray-500">
          {debouncedSearch
            ? `Aucun organisateur trouvé pour « ${debouncedSearch} ».`
            : 'Aucun organisateur disponible pour le moment.'}
        </p>
      )}

      {/* Compteur + grille */}
      {!isLoading && organizers.length > 0 && (
        <>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              {totalElements} organisateur{totalElements > 1 ? 's' : ''}
              {debouncedSearch ? ` pour « ${debouncedSearch} »` : ''}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizers.map((organizer) => (
              <OrganizerCard key={organizer.userId} organizer={organizer} />
            ))}
          </div>
        </>
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
