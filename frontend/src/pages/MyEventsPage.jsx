import { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query'
import { AppContext } from '../contexts/AppContextValue'
import {
  MapPin,
  Calendar,
  PenLine,
  CircleCheck,
  Clock,
  CircleX,
  Ticket,
  Megaphone,
  Send,
} from 'lucide-react'
import {
  fetchEvents,
  deleteEvent,
  publishEvent,
  cancelEvent,
  fetchMyRegistrations,
  cancelRegistration,
  fetchEventDetail,
  createEventAnnouncement,
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

const REG_STATUS_LABELS = {
  CONFIRMED: 'Confirmé',
  WAITLISTED: "Liste d'attente",
  PENDING: 'En attente',
  CANCELLED: 'Annulé',
}

const REG_STATUS_COLORS = {
  CONFIRMED: 'bg-green-100 text-green-800',
  WAITLISTED: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function MyEventsPage() {
  const { userRole, isAuthenticated, isLoading: authLoading } = useContext(AppContext)
  const queryClient = useQueryClient()

  const isStudent = userRole === 'STUDENT'
  const isOrganizerOrAdmin = userRole === 'ORGANIZER' || userRole === 'ADMIN'

  // Organizer/admin state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [publishingId, setPublishingId] = useState(null)
  const [publishError, setPublishError] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Announcement state
  const [announceTarget, setAnnounceTarget] = useState(null)
  const [announceContent, setAnnounceContent] = useState('')
  const [announceError, setAnnounceError] = useState('')
  const [isAnnouncing, setIsAnnouncing] = useState(false)
  const [announceSuccess, setAnnounceSuccess] = useState(false)

  // Student state
  const [cancelRegTarget, setCancelRegTarget] = useState(null)
  const [cancelRegError, setCancelRegError] = useState('')
  const [isCancellingReg, setIsCancellingReg] = useState(false)

  // Organizer/admin query
  const {
    data,
    isLoading: eventsLoading,
    error,
  } = useQuery({
    queryKey: ['myEvents'],
    queryFn: () => fetchEvents({ size: 50 }),
    enabled: !authLoading && isAuthenticated && isOrganizerOrAdmin,
  })

  // Student registrations query
  const {
    data: regData,
    isLoading: regLoading,
    error: regError,
  } = useQuery({
    queryKey: ['myRegistrations'],
    queryFn: () => fetchMyRegistrations({ size: 50 }),
    enabled: !authLoading && isAuthenticated && isStudent,
  })

  const registrations = isStudent && !authLoading && isAuthenticated ? (regData?.content ?? []) : []

  // Fetch event details for each registration in parallel
  const eventDetailQueries = useQueries({
    queries: registrations.map((reg) => ({
      queryKey: ['event', reg.eventId],
      queryFn: () => fetchEventDetail(reg.eventId),
      enabled: !!reg.eventId,
      retry: false,
    })),
  })

  const loading = authLoading || eventsLoading || regLoading
  const events = isAuthenticated && !authLoading ? (data?.content ?? []) : []

  function canDelete() {
    return userRole === 'ORGANIZER' || userRole === 'ADMIN'
  }

  async function handlePublish(event) {
    setPublishError('')
    setPublishingId(event.eventId)
    try {
      const updated = await publishEvent(event.eventId)
      queryClient.setQueryData(['myEvents'], (old) => ({
        ...old,
        content: (old?.content ?? []).map((e) => (e.eventId === updated.eventId ? updated : e)),
      }))
    } catch (err) {
      const status = err?.response?.status ?? err?.cause?.response?.status
      if (status === 403)
        setPublishError("Accès refusé : vous n'êtes pas l'organisateur de cet événement.")
      else if (status === 409)
        setPublishError(err.message || 'Impossible de publier : statut invalide.')
      else setPublishError(err.message || 'Une erreur est survenue lors de la publication.')
    } finally {
      setPublishingId(null)
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelError('')
    setIsCancelling(true)
    try {
      const updated = await cancelEvent(cancelTarget.eventId, cancelReason.trim() || undefined)
      queryClient.setQueryData(['myEvents'], (old) => ({
        ...old,
        content: (old?.content ?? []).map((e) => (e.eventId === updated.eventId ? updated : e)),
      }))
      setCancelTarget(null)
      setCancelReason('')
    } catch (err) {
      const status = err?.response?.status ?? err?.cause?.response?.status
      if (status === 403)
        setCancelError("Accès refusé : vous n'êtes pas l'organisateur de cet événement.")
      else if (status === 409)
        setCancelError(err.message || 'Impossible d’annuler : statut invalide.')
      else setCancelError(err.message || "Une erreur est survenue lors de l'annulation.")
      setCancelTarget(null)
      setCancelReason('')
    } finally {
      setIsCancelling(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    setIsDeleting(true)
    try {
      await deleteEvent(deleteTarget.eventId)
      queryClient.setQueryData(['myEvents'], (old) => ({
        ...old,
        content: (old?.content ?? []).filter((e) => e.eventId !== deleteTarget.eventId),
      }))
      setDeleteTarget(null)
    } catch (err) {
      const status = err?.response?.status ?? err?.cause?.response?.status
      if (status === 403)
        setDeleteError("Accès refusé : vous n'êtes pas l'organisateur de cet événement.")
      else if (status === 409)
        setDeleteError("Impossible de supprimer un événement publié. Annulez-le d'abord.")
      else setDeleteError(err.message || 'Une erreur est survenue lors de la suppression.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleAnnounce(e) {
    e.preventDefault()
    if (!announceTarget || !announceContent.trim()) return
    setAnnounceError('')
    setIsAnnouncing(true)
    setAnnounceSuccess(false)
    try {
      await createEventAnnouncement(announceTarget.eventId, announceContent.trim())
      setAnnounceSuccess(true)
      setAnnounceContent('')
    } catch (err) {
      setAnnounceError(err.message || "Impossible de publier l'annonce.")
    } finally {
      setIsAnnouncing(false)
    }
  }

  function closeAnnounceDialog() {
    setAnnounceTarget(null)
    setAnnounceContent('')
    setAnnounceError('')
    setAnnounceSuccess(false)
  }

  async function confirmCancelRegistration() {
    if (!cancelRegTarget) return
    setCancelRegError('')
    setIsCancellingReg(true)
    try {
      await cancelRegistration(cancelRegTarget.registrationId)
      queryClient.setQueryData(['myRegistrations'], (old) => ({
        ...old,
        content: (old?.content ?? []).filter(
          (r) => r.registrationId !== cancelRegTarget.registrationId,
        ),
      }))
      setCancelRegTarget(null)
    } catch (err) {
      setCancelRegError(err.message || "Impossible d'annuler votre inscription.")
      setCancelRegTarget(null)
    } finally {
      setIsCancellingReg(false)
    }
  }

  return (
    <>
      {/* Announce dialog */}
      {announceTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announce-dialog-title"
          onClick={closeAnnounceDialog}
          onKeyDown={(e) => e.key === 'Escape' && closeAnnounceDialog()}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <h2 id="announce-dialog-title" className="text-base font-semibold text-gray-900">
                Nouvelle annonce
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">Pour &laquo;{announceTarget.title}&raquo;</p>

            {announceSuccess ? (
              <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 p-3 text-sm mb-4">
                Annonce publiée avec succès.
              </div>
            ) : (
              <form onSubmit={handleAnnounce} className="space-y-3">
                <textarea
                  rows={4}
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  placeholder="Rédigez votre annonce pour les participants…"
                  maxLength={1000}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">{announceContent.length}/1000</span>
                  {announceError && <p className="text-xs text-red-600 flex-1">{announceError}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeAnnounceDialog}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!announceContent.trim() || isAnnouncing}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isAnnouncing ? 'Envoi…' : 'Publier'}
                  </button>
                </div>
              </form>
            )}

            {announceSuccess && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeAnnounceDialog}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="cancel-confirm-title" className="text-lg font-semibold text-gray-900">
              Annuler l&apos;événement
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Voulez-vous vraiment annuler{' '}
              <span className="font-medium">&laquo;{cancelTarget.title}&raquo;</span> ? Cette action
              est irréversible.
            </p>
            <div className="mt-4">
              <label
                htmlFor="cancel-reason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Motif <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex : Problème logistique, intervenant indisponible…"
                maxLength={500}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                disabled={isCancelling}
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{cancelReason.length}/500</p>
            </div>
            {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null)
                  setCancelReason('')
                }}
                disabled={isCancelling}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={isCancelling}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {isCancelling ? 'Annulation…' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-confirm-title" className="text-lg font-semibold text-gray-900">
              Supprimer l&apos;événement
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Voulez-vous vraiment supprimer{' '}
              <span className="font-medium">&laquo;{deleteTarget.title}&raquo;</span> ? Cette action
              est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student: cancel registration confirmation dialog */}
      {cancelRegTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-reg-confirm-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="cancel-reg-confirm-title" className="text-lg font-semibold text-gray-900">
              Annuler l&apos;inscription
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Voulez-vous vraiment annuler votre inscription ? Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelRegTarget(null)}
                disabled={isCancellingReg}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={confirmCancelRegistration}
                disabled={isCancellingReg}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {isCancellingReg ? 'Annulation…' : "Annuler l'inscription"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 max-w-5xl mx-auto">
        {isStudent ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Mes inscriptions</h1>
              <p className="text-gray-500 mt-1">Les événements auxquels vous êtes inscrit.</p>
            </div>

            {/* Errors */}
            {regError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4 mb-6">
                {regError.message}
              </div>
            )}
            {cancelRegError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4 mb-6">
                {cancelRegError}
              </div>
            )}

            {/* Skeleton loading */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-white p-5 shadow-sm animate-pulse">
                    <div className="flex justify-between mb-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-pink-100 rounded-full w-16" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                    <div className="mt-4 h-8 bg-gray-100 rounded-lg w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !regError && registrations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Ticket className="w-16 h-16 mb-4 text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-700 mb-1">
                  Aucune inscription pour le moment
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Parcourez les événements et inscrivez-vous pour les retrouver ici.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 transition-colors"
                >
                  Explorer les événements
                </Link>
              </div>
            )}

            {/* Card grid */}
            {!loading && registrations.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {registrations.map((reg, idx) => {
                  const eventData = eventDetailQueries[idx]?.data
                  const isLoadingEvent = eventDetailQueries[idx]?.isLoading
                  const isEventError = eventDetailQueries[idx]?.isError
                  const isCancellable = reg.status === 'CONFIRMED' || reg.status === 'WAITLISTED'
                  // When the event is inaccessible (cancelled backend-side but registration
                  // not yet updated), display the card as CANCELLED
                  const displayStatus = !isLoadingEvent && isEventError ? 'CANCELLED' : reg.status

                  return (
                    <div
                      key={reg.registrationId}
                      className="group rounded-xl border bg-white shadow-sm hover:shadow-md hover:border-pink-200 transition-all flex flex-col"
                    >
                      {/* Card header: colored band based on status */}
                      <div
                        className={`h-1.5 w-full rounded-t-xl ${
                          displayStatus === 'CONFIRMED'
                            ? 'bg-green-400'
                            : displayStatus === 'WAITLISTED'
                              ? 'bg-yellow-400'
                              : displayStatus === 'CANCELLED'
                                ? 'bg-red-300'
                                : 'bg-gray-300'
                        }`}
                      />

                      <div className="p-5 flex flex-col flex-1">
                        {/* Title + category */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {isLoadingEvent ? (
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                          ) : (
                            <Link
                              to={`/events/${reg.eventId}`}
                              className="text-base font-semibold text-gray-900 group-hover:text-pink-600 line-clamp-2 leading-snug"
                            >
                              {eventData?.title ?? 'Événement annulé'}
                            </Link>
                          )}
                          {eventData?.category && (
                            <span className="shrink-0 rounded-full bg-pink-50 text-pink-600 px-2 py-0.5 text-xs font-medium">
                              {eventData.category}
                            </span>
                          )}
                        </div>

                        {/* Event details */}
                        <div className="space-y-1 text-sm text-gray-500 mb-4">
                          {eventData?.place && (
                            <p className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{eventData.place}</span>
                            </p>
                          )}
                          {eventData?.time && (
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              {new Date(eventData.time).toLocaleDateString('fr-CH', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                          {reg.registeredAt && (
                            <p className="flex items-center gap-1.5 text-xs text-gray-400">
                              <PenLine className="w-3.5 h-3.5 shrink-0" />
                              Inscrit le{' '}
                              {new Date(reg.registeredAt).toLocaleDateString('fr-CH', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="mb-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${REG_STATUS_COLORS[displayStatus] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {displayStatus === 'CONFIRMED' && (
                              <CircleCheck className="w-3.5 h-3.5" />
                            )}
                            {displayStatus === 'WAITLISTED' && <Clock className="w-3.5 h-3.5" />}
                            {displayStatus === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                            {displayStatus === 'CANCELLED' && <CircleX className="w-3.5 h-3.5" />}
                            {REG_STATUS_LABELS[displayStatus] ?? displayStatus}
                            {displayStatus === 'WAITLISTED' && reg.waitlistPosition
                              ? ` — pos. ${reg.waitlistPosition}`
                              : ''}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="mt-auto flex gap-2">
                          {displayStatus !== 'CANCELLED' && (
                            <Link
                              to={`/events/${reg.eventId}`}
                              className="flex-1 text-center rounded-lg bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-700 transition-colors"
                            >
                              Voir l&apos;événement
                            </Link>
                          )}
                          {isCancellable && (
                            <button
                              type="button"
                              onClick={() => setCancelRegTarget(reg)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors"
                              title="Annuler l'inscription"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
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
                {error.message}
              </div>
            )}

            {publishError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
                {publishError}
              </div>
            )}

            {cancelError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
                {cancelError}
              </div>
            )}

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
                {deleteError}
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
                          <Link
                            to={`/events/${event.eventId}`}
                            className="text-blue-600 hover:underline"
                          >
                            Voir
                          </Link>
                          {(userRole === 'ORGANIZER' || userRole === 'ADMIN') &&
                            event.status !== 'CANCELLED' && (
                              <Link
                                to={`/events/edit/${event.eventId}`}
                                className="text-gray-600 hover:underline"
                              >
                                Modifier
                              </Link>
                            )}
                          {event.status === 'DRAFT' &&
                            (userRole === 'ORGANIZER' || userRole === 'ADMIN') && (
                              <button
                                type="button"
                                onClick={() => handlePublish(event)}
                                disabled={publishingId === event.eventId}
                                className="text-green-600 hover:underline disabled:opacity-50"
                              >
                                {publishingId === event.eventId ? 'Publication…' : 'Publier'}
                              </button>
                            )}
                          {event.status === 'PUBLISHED' &&
                            (userRole === 'ORGANIZER' || userRole === 'ADMIN') && (
                              <button
                                type="button"
                                onClick={() => setCancelTarget(event)}
                                className="text-orange-600 hover:underline"
                              >
                                Annuler
                              </button>
                            )}
                          {(userRole === 'ORGANIZER' || userRole === 'ADMIN') &&
                            event.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAnnounceTarget(event)
                                  setAnnounceContent('')
                                  setAnnounceError('')
                                  setAnnounceSuccess(false)
                                }}
                                className="text-blue-600 hover:underline"
                              >
                                Annonce
                              </button>
                            )}
                          {canDelete() && event.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(event)}
                              className="text-red-600 hover:underline"
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
