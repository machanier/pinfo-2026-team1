import { useContext } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppContext } from '../contexts/AppContextValue'
import { fetchEventDetail } from '../lib/apiServices'

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

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-CH', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userRole, userId } = useContext(AppContext)

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventDetail(id),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">
          Événement introuvable ou inaccessible.
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Retour
        </button>
      </div>
    )
  }

  const isOwner = userId && event.organizerId === userId
  const canManage = isOwner || userRole === 'ADMIN'
  const spotsLeft = event.capacity != null ? event.capacity - (event.registeredCount ?? 0) : null

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Retour */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Retour
      </button>

      {/* En-tête */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[event.status] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {STATUS_LABELS[event.status] ?? event.status}
              </span>
              {event.category && (
                <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                  {event.category}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          </div>

          {canManage && (
            <Link
              to={`/events/edit/${event.eventId}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Modifier
            </Link>
          )}
        </div>

        {/* Infos clés */}
        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 font-medium">📍 Lieu</dt>
            <dd className="text-gray-900 mt-0.5">{event.place || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">🗓 Début</dt>
            <dd className="text-gray-900 mt-0.5">{formatDate(event.time)}</dd>
          </div>
          {event.endTime && (
            <div>
              <dt className="text-gray-500 font-medium">🏁 Fin</dt>
              <dd className="text-gray-900 mt-0.5">{formatDate(event.endTime)}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 font-medium">👥 Places</dt>
            <dd className="text-gray-900 mt-0.5">
              {event.capacity == null
                ? 'Illimitées'
                : `${event.registeredCount ?? 0} / ${event.capacity} inscrit${(event.registeredCount ?? 0) !== 1 ? 's' : ''}`}
              {spotsLeft != null && spotsLeft <= 10 && spotsLeft > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({spotsLeft} place{spotsLeft > 1 ? 's' : ''} restante{spotsLeft > 1 ? 's' : ''})
                </span>
              )}
              {spotsLeft === 0 && <span className="ml-2 text-red-600 font-medium">Complet</span>}
            </dd>
          </div>
          {event.organizerName && (
            <div>
              <dt className="text-gray-500 font-medium">🎓 Organisateur</dt>
              <dd className="text-gray-900 mt-0.5">
                <Link
                  to={`/organizers/${event.organizerId}`}
                  className="text-blue-600 hover:underline"
                >
                  {event.organizerName}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Description */}
      {event.description && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* Tags */}
      {event.tags?.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Restrictions d'accès */}
      {event.restrictedTo && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">🔒 Accès restreint</h2>
          <div className="text-sm text-yellow-900 space-y-1">
            {event.restrictedTo.faculties?.length > 0 && (
              <p>
                <span className="font-medium">Facultés :</span>{' '}
                {event.restrictedTo.faculties.join(', ')}
              </p>
            )}
            {event.restrictedTo.majors?.length > 0 && (
              <p>
                <span className="font-medium">Filières :</span>{' '}
                {event.restrictedTo.majors.join(', ')}
              </p>
            )}
            {event.restrictedTo.degreeLevels?.length > 0 && (
              <p>
                <span className="font-medium">Niveaux :</span>{' '}
                {event.restrictedTo.degreeLevels.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
