import { useContext, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppContext } from '../contexts/AppContextValue'
import {
  fetchEventDetail,
  fetchMyRegistrations,
  registerForEvent,
  cancelRegistration,
} from '../lib/apiServices'

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
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState(null) // 'register' | 'cancel' | null

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventDetail(id),
    retry: false,
  })

  const { data: myRegistrations } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: () => fetchMyRegistrations(),
    enabled: !!userId && userRole === 'STUDENT',
  })

  const registerMutation = useMutation({
    mutationFn: () => registerForEvent(id),
    onSuccess: () => {
      queryClient.setQueryData(['event', id], (old) =>
        old ? { ...old, registeredCount: (old.registeredCount ?? 0) + 1 } : old,
      )
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onSettled: () => setConfirmAction(null),
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      cancelRegistration(
        myRegistrations?.content?.find((r) => r.eventId === id && r.status !== 'CANCELLED')
          ?.registrationId,
      ),
    onSuccess: () => {
      queryClient.setQueryData(['event', id], (old) =>
        old ? { ...old, registeredCount: Math.max(0, (old.registeredCount ?? 0) - 1) } : old,
      )
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onSettled: () => setConfirmAction(null),
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

  const myRegistration = myRegistrations?.content?.find(
    (r) => r.eventId === id && r.status !== 'CANCELLED',
  )

  return (
    <>
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
              <dt className="text-gray-500 font-medium">👥 Places restantes</dt>
              <dd className="text-gray-900 mt-0.5">
                {event.capacity == null ? (
                  'Illimitées'
                ) : spotsLeft === 0 ? (
                  <span className="text-red-600 font-medium">Complet</span>
                ) : (
                  <span className={spotsLeft <= 10 ? 'text-orange-600 font-medium' : ''}>
                    {spotsLeft} place{spotsLeft > 1 ? 's' : ''} restante{spotsLeft > 1 ? 's' : ''}
                  </span>
                )}
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

        {/* Inscription */}
        {!canManage && event.status === 'PUBLISHED' && userId && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            {myRegistration ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">
                  {myRegistration.status === 'CONFIRMED' && '✅ Vous êtes inscrit à cet événement'}
                  {myRegistration.status === 'WAITLISTED' &&
                    `⏳ En liste d'attente${myRegistration.waitlistPosition ? ` (position ${myRegistration.waitlistPosition})` : ''}`}
                  {myRegistration.status === 'PENDING' &&
                    '⏳ Inscription en attente de confirmation'}
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmAction('cancel')}
                  disabled={cancelMutation.isPending}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Annulation…' : "Annuler l'inscription"}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  {spotsLeft === 0 ? 'Plus de places disponibles' : 'Rejoignez cet événement'}
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmAction('register')}
                  disabled={registerMutation.isPending || spotsLeft === 0}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registerMutation.isPending
                    ? 'Inscription…'
                    : spotsLeft === 0
                      ? 'Complet'
                      : "S'inscrire"}
                </button>
              </div>
            )}
            {registerMutation.isError && (
              <p className="mt-3 text-sm text-red-600">{registerMutation.error?.message}</p>
            )}
            {cancelMutation.isError && (
              <p className="mt-3 text-sm text-red-600">{cancelMutation.error?.message}</p>
            )}
          </div>
        )}

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

      {/* Dialog de confirmation */}
      {confirmAction && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
          onKeyDown={(e) => e.key === 'Escape' && setConfirmAction(null)}
        >
          <div
            role="presentation"
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">
              {confirmAction === 'register' ? "Confirmer l'inscription" : "Confirmer l'annulation"}
            </h2>
            <p className="text-sm text-gray-600">
              {confirmAction === 'register'
                ? `Voulez-vous vous inscrire à « ${event.title} » ?`
                : `Voulez-vous annuler votre inscription à « ${event.title} » ?`}
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmAction === 'register' ? registerMutation.mutate() : cancelMutation.mutate()
                }
                disabled={registerMutation.isPending || cancelMutation.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmAction === 'register'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {registerMutation.isPending || cancelMutation.isPending ? 'En cours…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
