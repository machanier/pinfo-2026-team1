import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  User,
} from 'lucide-react'
import {
  fetchModerationCase,
  fetchEventDetail,
  approveModerationCase,
  rejectModerationCase,
} from '../lib/apiServices'

const STATUS_LABELS = {
  PENDING: 'En attente',
  AUTO_APPROVED: 'Auto-approuvé',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  AUTO_APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-400' : 'bg-yellow-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
    </div>
  )
}

export default function AdminModerationDetailPage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Approve form state
  const [adminNote, setAdminNote] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [approveError, setApproveError] = useState('')

  // Reject form state
  const [rejectReason, setRejectReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectError, setRejectError] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const {
    data: moderationCase,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['moderationCase', caseId],
    queryFn: () => fetchModerationCase(caseId),
    enabled: !!caseId,
  })

  const {
    data: eventDetail,
    isLoading: isEventLoading,
    error: eventError,
  } = useQuery({
    queryKey: ['eventDetail', moderationCase?.eventId],
    queryFn: () => fetchEventDetail(moderationCase.eventId),
    enabled: !!moderationCase?.eventId,
  })

  const isDecided =
    moderationCase?.status === 'APPROVED' ||
    moderationCase?.status === 'REJECTED' ||
    moderationCase?.status === 'AUTO_APPROVED'

  async function handleApprove(e) {
    e.preventDefault()
    setApproveError('')
    setIsApproving(true)
    try {
      await approveModerationCase(caseId, adminNote.trim())
      queryClient.invalidateQueries({ queryKey: ['moderationQueue'] })
      queryClient.invalidateQueries({ queryKey: ['moderationCase', caseId] })
      navigate('/admin/moderation', { state: { toastSuccess: 'Événement approuvé et publié.' } })
    } catch (err) {
      setApproveError(err.message || "Impossible d'approuver ce cas.")
    } finally {
      setIsApproving(false)
    }
  }

  async function handleReject(e) {
    e.preventDefault()
    if (!rejectReason.trim()) {
      setRejectError('Le motif de rejet est requis.')
      return
    }
    setRejectError('')
    setIsRejecting(true)
    try {
      await rejectModerationCase(caseId, rejectReason.trim())
      queryClient.invalidateQueries({ queryKey: ['moderationQueue'] })
      queryClient.invalidateQueries({ queryKey: ['moderationCase', caseId] })
      navigate('/admin/moderation', { state: { toastSuccess: 'Événement rejeté.' } })
    } catch (err) {
      setRejectError(err.message || 'Impossible de rejeter ce cas.')
    } finally {
      setIsRejecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-500">Chargement du cas…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error.message}
        </div>
        <Link
          to={`/admin/moderation?status=${moderationCase?.status ?? 'PENDING'}`}
          className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la file
        </Link>
      </div>
    )
  }

  const c = moderationCase
  const flags = c?.flags ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/admin/moderation?status=${c?.status ?? 'PENDING'}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la file
        </Link>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLORS[c?.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {STATUS_LABELS[c?.status] ?? c?.status}
        </span>
      </div>

      {/* Case info card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">{c?.title || '—'}</h1>
          <p className="mt-0.5 text-xs font-mono text-gray-400">Cas {c?.caseId}</p>
        </div>

        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="truncate font-mono text-xs" title={c?.organizerId}>
              {c?.organizerId}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <span>Soumis le {formatDate(c?.createdAt)}</span>
          </div>

          {c?.decidedAt && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
              <span>Décidé le {formatDate(c?.decidedAt)}</span>
            </div>
          )}

          {c?.adminNote && (
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Note admin</p>
              <p className="text-gray-700">{c.adminNote}</p>
            </div>
          )}

          {c?.rejectionReason && (
            <div className="sm:col-span-2">
              <p className="text-xs text-red-500 font-medium mb-0.5">Motif de rejet</p>
              <p className="text-red-700">{c.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Event detail card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Contenu de l'événement</h2>
        </div>
        {isEventLoading && (
          <p className="px-6 py-4 text-sm text-gray-400">Chargement de l'événement…</p>
        )}
        {eventError && (
          <p className="px-6 py-4 text-sm text-red-500">
            Impossible de charger les détails de l'événement.
          </p>
        )}
        {eventDetail && (
          <div className="px-6 py-4 space-y-3 text-sm text-gray-700">
            {/* Banner */}
            {eventDetail.bannerImageUrl ? (
              <img
                src={eventDetail.bannerImageUrl}
                alt="Bannière de l'événement"
                className="w-full max-h-56 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <p className="text-xs italic text-gray-400">Aucune bannière pour cet événement.</p>
            )}
            {eventDetail.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                <p className="whitespace-pre-line">{eventDetail.description}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eventDetail.time && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Date de début</p>
                  <p>{formatDate(eventDetail.time)}</p>
                </div>
              )}
              {eventDetail.endTime && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Date de fin</p>
                  <p>{formatDate(eventDetail.endTime)}</p>
                </div>
              )}
              {eventDetail.place && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Lieu</p>
                  <p>{eventDetail.place}</p>
                </div>
              )}
              {eventDetail.capacity != null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Capacité</p>
                  <p>{eventDetail.capacity} places</p>
                </div>
              )}
              {eventDetail.category && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Catégorie</p>
                  <p>{eventDetail.category}</p>
                </div>
              )}
              {eventDetail.tags?.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {eventDetail.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Flags */}
      {flags.length > 0 ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-orange-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-orange-800">
              {flags.length} signal{flags.length > 1 ? 'aux' : ''} détecté
              {flags.length > 1 ? 's' : ''} par l'IA
            </h2>
          </div>
          <div className="divide-y divide-orange-100">
            {flags.map((flag, i) => (
              <div key={i} className="px-6 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{flag.reason}</span>
                  <span className="text-xs font-mono text-gray-400 bg-white border border-orange-100 px-2 py-0.5 rounded">
                    {flag.field}
                  </span>
                </div>
                {flag.confidence != null && <ConfidenceBar value={flag.confidence} />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 text-sm text-gray-500 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-gray-300" />
          Aucun signal automatique détecté — en attente de vérification manuelle.
        </div>
      )}

      {/* Decision actions — only for PENDING */}
      {!isDecided && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Approve panel */}
          <div className="rounded-xl border border-green-200 bg-white shadow-sm p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700 mb-3">
              <CheckCircle className="h-4 w-4" /> Approuver
            </h3>
            <form onSubmit={handleApprove} className="space-y-3">
              <div>
                <label
                  htmlFor="admin-note"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Note interne <span className="text-gray-400 font-normal">(optionnelle)</span>
                </label>
                <textarea
                  id="admin-note"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Commentaire réservé aux admins…"
                  maxLength={500}
                  disabled={isApproving}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none disabled:opacity-60"
                />
              </div>
              {approveError && <p className="text-xs text-red-600">{approveError}</p>}
              <button
                type="submit"
                disabled={isApproving || isRejecting}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                {isApproving ? 'Approbation…' : 'Approuver et publier'}
              </button>
            </form>
          </div>

          {/* Reject panel */}
          <div className="rounded-xl border border-red-200 bg-white shadow-sm p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
              <XCircle className="h-4 w-4" /> Rejeter
            </h3>
            {!showRejectForm ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500">
                  Le rejet renvoie l'événement en brouillon et notifie l'organisateur.
                </p>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isApproving}
                  className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rejeter cet événement
                </button>
              </div>
            ) : (
              <form onSubmit={handleReject} className="space-y-3">
                <div>
                  <label
                    htmlFor="reject-reason"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Motif de rejet <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Expliquez pourquoi l'événement est rejeté…"
                    maxLength={500}
                    disabled={isRejecting}
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none disabled:opacity-60"
                  />
                  <p className="text-right text-xs text-gray-400 mt-0.5">
                    {rejectReason.length}/500
                  </p>
                </div>
                {rejectError && <p className="text-xs text-red-600">{rejectError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(false)
                      setRejectReason('')
                      setRejectError('')
                    }}
                    disabled={isRejecting}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isRejecting || isApproving || !rejectReason.trim()}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRejecting ? 'Rejet…' : 'Confirmer le rejet'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Already decided banner */}
      {isDecided && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium flex items-center gap-2 ${
            c?.status === 'APPROVED' || c?.status === 'AUTO_APPROVED'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {c?.status === 'REJECTED' ? (
            <XCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0" />
          )}
          Ce cas a déjà été traité — statut : {STATUS_LABELS[c?.status] ?? c?.status}.
        </div>
      )}
    </div>
  )
}
