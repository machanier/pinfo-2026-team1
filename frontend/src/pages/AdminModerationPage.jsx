import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, ChevronLeft, ChevronRight, Inbox, CheckCircle } from 'lucide-react'
import { fetchModerationQueue } from '../lib/apiServices'
import OrganizerName from '../components/moderation/OrganizerName'

const STATUS_TABS = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'AUTO_APPROVED', label: 'Auto-approuvé' },
  { value: 'APPROVED', label: 'Approuvé' },
  { value: 'REJECTED', label: 'Rejeté' },
]

const STATUS_LABELS = {
  PENDING: 'En attente',
  AUTO_APPROVED: 'Auto-approuvé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  AUTO_APPROVED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const PAGE_SIZE = 20

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminModerationPage() {
  // Keep the active tab in the URL (?status=…) so opening a case and coming back
  // (browser "back" or the "Retour à la file" link) restores the tab you were on,
  // instead of always snapping to "En attente".
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('status')
  const status = STATUS_TABS.some((t) => t.value === requested) ? requested : 'PENDING'
  const [page, setPage] = useState(0)
  const location = useLocation()
  const toastSuccess = location.state?.toastSuccess ?? null

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['moderationQueue', status, page],
    queryFn: () => fetchModerationQueue({ status, page, size: PAGE_SIZE }),
  })

  const cases = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0

  function selectStatus(next) {
    setSearchParams((prev) => {
      prev.set('status', next)
      return prev
    })
    setPage(0)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ShieldCheck className="w-6 h-6 text-pink-600" />
          File de modération
        </h1>
        <p className="text-gray-500 mt-1">
          Examinez les événements et annonces soumis, puis approuvez-les ou rejetez-les.
        </p>
      </div>

      {toastSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {toastSuccess}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => selectStatus(tab.value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error.message}
        </div>
      )}

      {isLoading && <p className="text-gray-500">Chargement…</p>}

      {!isLoading && !error && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-1 text-lg font-semibold text-gray-700">
            Aucun cas dans cette catégorie
          </h2>
          <p className="text-sm text-gray-500">Rien à examiner ici pour le moment.</p>
        </div>
      )}

      {!isLoading && !error && cases.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Titre</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Organisateur</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Créé le</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {cases.map((c) => (
                  <tr key={c.caseId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link
                        to={`/admin/moderation/${c.caseId}`}
                        className="block max-w-[18rem] break-words hover:text-pink-600 hover:underline"
                      >
                        {c.title || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="block max-w-[12rem] truncate">
                        <OrganizerName eventId={c.eventId} organizerId={c.organizerId} />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/moderation/${c.caseId}`}
                        className="text-pink-600 hover:underline"
                      >
                        Examiner
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              {totalElements} cas — page {page + 1} sur {Math.max(totalPages, 1)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0 || isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages || isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
