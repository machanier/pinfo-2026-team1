import { useContext, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppContext } from '../contexts/AppContextValue'
import {
  MapPin,
  Calendar,
  Flag,
  Users,
  GraduationCap,
  CircleCheck,
  Clock,
  Lock,
  Megaphone,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  fetchEventDetail,
  fetchMyRegistrations,
  registerForEvent,
  cancelRegistration,
  fetchEventAnnouncements,
  createEventAnnouncement,
  deleteEventAnnouncement,
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
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [pendingDeleteAnnouncementId, setPendingDeleteAnnouncementId] = useState(null)

  const {
    data: event,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['event', id],
    queryFn: () => fetchEventDetail(id),
    retry: false,
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30_000),
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

  const [announcementPage, setAnnouncementPage] = useState(0)

  const { data: announcements } = useQuery({
    queryKey: ['event-announcements', id, announcementPage],
    queryFn: () => fetchEventAnnouncements(id, announcementPage, 3),
    enabled: !!id,
    retry: false,
  })

  const announcementMutation = useMutation({
    mutationFn: (content) => createEventAnnouncement(id, content),
    onSuccess: () => {
      setNewAnnouncement('')
      setAnnouncementPage(0)
      queryClient.invalidateQueries({ queryKey: ['event-announcements', id] })
    },
  })

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (announcementId) => deleteEventAnnouncement(id, announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-announcements', id] })
    },
  })

  function handleAnnouncementSubmit(e) {
    e.preventDefault()
    const trimmed = newAnnouncement.trim()
    if (!trimmed) return
    announcementMutation.mutate(trimmed)
  }

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

  const isOwner = event.requesterIsOrganizer === true
  const canManage = isOwner || userRole === 'ADMIN'
  const spotsLeft = event.capacity != null ? event.capacity - (event.registeredCount ?? 0) : null

  const myRegistration = myRegistrations?.content?.find(
    (r) => r.eventId === id && r.status !== 'CANCELLED',
  )
  const hadRegistration = myRegistrations?.content?.some((r) => r.eventId === id)

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
              <dt className="text-gray-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Lieu
              </dt>
              <dd className="text-gray-900 mt-0.5">{event.place || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Début
              </dt>
              <dd className="text-gray-900 mt-0.5">{formatDate(event.time)}</dd>
            </div>
            {event.endTime && (
              <div>
                <dt className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> Fin
                </dt>
                <dd className="text-gray-900 mt-0.5">{formatDate(event.endTime)}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Places restantes
              </dt>
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
                <dt className="text-gray-500 font-medium flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Organisateur
                </dt>
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

        {/* Bannière annulation */}
        {event.status === 'CANCELLED' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Cet événement a été annulé</p>
              {hadRegistration && (
                <p className="text-sm text-red-600 mt-1">
                  Votre inscription a été automatiquement annulée.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Inscription */}
        {!canManage && event.status === 'PUBLISHED' && userId && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            {myRegistration ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                  {myRegistration.status === 'CONFIRMED' && (
                    <>
                      <CircleCheck className="w-4 h-4 text-green-600 shrink-0" /> Vous êtes inscrit
                      à cet événement
                    </>
                  )}
                  {myRegistration.status === 'WAITLISTED' && (
                    <>
                      <Clock className="w-4 h-4 text-yellow-600 shrink-0" /> En liste d&apos;attente
                      {myRegistration.waitlistPosition
                        ? ` (position ${myRegistration.waitlistPosition})`
                        : ''}
                    </>
                  )}
                  {myRegistration.status === 'PENDING' && (
                    <>
                      <Clock className="w-4 h-4 text-gray-500 shrink-0" /> Inscription en attente de
                      confirmation
                    </>
                  )}
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
            <h2 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5" /> Accès restreint
            </h2>
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

        {/* Annonces */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" /> Annonces
          </h2>

          {/* Formulaire pour organisateurs / admins */}
          {canManage && (
            <form onSubmit={handleAnnouncementSubmit} className="mb-5">
              <div className="flex gap-2 items-start">
                <textarea
                  rows={2}
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Rédigez une annonce pour les participants…"
                  maxLength={2000}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={!newAnnouncement.trim() || announcementMutation.isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {announcementMutation.isPending ? 'Envoi…' : 'Publier'}
                </button>
              </div>
              {announcementMutation.isError && (
                <p className="mt-2 text-xs text-red-600">{announcementMutation.error?.message}</p>
              )}
            </form>
          )}

          {/* Liste des annonces */}
          {announcements?.content?.length > 0 ? (
            <>
              <ul className="space-y-3">
                {announcements.content.map((announcement) => (
                  <li
                    key={announcement.announcementId}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAnnouncement(announcement)}
                        className="flex-1 text-left text-gray-800 leading-relaxed truncate hover:text-blue-600 transition-colors"
                        title="Voir l'annonce complète"
                      >
                        {announcement.body.length > 120
                          ? announcement.body.slice(0, 120) + '…'
                          : announcement.body}
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDeleteAnnouncementId(announcement.announcementId)
                          }
                          disabled={deleteAnnouncementMutation.isPending}
                          className="shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="Supprimer l'annonce"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      {formatDate(announcement.postedAt)}
                    </p>
                  </li>
                ))}
              </ul>
              {announcements.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setAnnouncementPage((p) => p - 1)}
                    disabled={announcementPage === 0}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Précédent
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {announcementPage + 1} / {announcements.totalPages}
                  </span>
                  <button
                    onClick={() => setAnnouncementPage((p) => p + 1)}
                    disabled={announcementPage >= announcements.totalPages - 1}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Aucune annonce pour le moment.</p>
          )}
        </div>
      </div>

      {/* Modal détail annonce */}
      {selectedAnnouncement && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedAnnouncement(null)}
          onKeyDown={(e) => e.key === 'Escape' && setSelectedAnnouncement(null)}
        >
          <div
            role="presentation"
            className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-gray-400">{formatDate(selectedAnnouncement.postedAt)}</p>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed overflow-y-auto">
              {selectedAnnouncement.body}
            </p>
          </div>
        </div>
      )}

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
      {/* Dialog de confirmation — suppression d'annonce */}
      {pendingDeleteAnnouncementId && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPendingDeleteAnnouncementId(null)}
          onKeyDown={(e) => e.key === 'Escape' && setPendingDeleteAnnouncementId(null)}
        >
          <div
            role="presentation"
            className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">Supprimer l'annonce</h2>
            <p className="text-sm text-gray-600">
              Voulez-vous vraiment supprimer cette annonce ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteAnnouncementId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAnnouncementMutation.mutate(pendingDeleteAnnouncementId, {
                    onSettled: () => setPendingDeleteAnnouncementId(null),
                  })
                }}
                disabled={deleteAnnouncementMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAnnouncementMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
