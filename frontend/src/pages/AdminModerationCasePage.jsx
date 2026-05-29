import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Flag } from 'lucide-react'
import { fetchModerationCase, approveModerationCase } from '../lib/apiServices'

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

function confidencePercent(confidence) {
  if (typeof confidence !== 'number') return 0
  return Math.round(Math.min(Math.max(confidence, 0), 1) * 100)
}

function confidenceBarColor(pct) {
  if (pct >= 70) return 'bg-red-500'
  if (pct >= 40) return 'bg-yellow-500'
  return 'bg-gray-400'
}

export default function AdminModerationCasePage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: moderationCase, isLoading, error } = useQuery({
    queryKey: ['moderationCase', caseId],
    queryFn: () => fetchModerationCase(caseId),
  })

  const [approveOpen, setApproveOpen] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  async function afterDecision() {
    await queryClient.invalidateQueries({ queryKey: ['moderationQueue'] })
    queryClient.invalidateQueries({ queryKey: ['moderationCase', caseId] })
    navigate('/admin/moderation')
  }

  async function confirmApprove() {
    setActionError('')
    setIsSubmitting(true)
    try {
      await approveModerationCase(caseId, adminNote.trim() || undefined)
      setApproveOpen(false)
      await afterDecision()
    } catch (err) {
      setActionError(err.message || "Impossible d'approuver ce cas.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const flags = moderationCase?.flags ?? []
  const isPending = moderationCase?.status === 'PENDING'
  const isAnnouncement = Boolean(moderationCase?.announcementId)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        to="/admin/moderation"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la file
      </Link>

      {isLoading && <p className="text-gray-500">Chargement…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error.message}
        </div>
      )}

      {!isLoading && !error && moderationCase && (
        <>
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {isAnnouncement ? 'Annonce' : 'Événement'}
              </p>
              <h1 className="text-2xl font-bold text-gray-900">{moderationCase.title || '—'}</h1>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[moderationCase.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {STATUS_LABELS[moderationCase.status] ?? moderationCase.status}
            </span>
          </div>

          {/* Meta */}
          <dl className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-gray-400">Organisateur</dt>
              <dd className="break-all font-mono text-sm text-gray-700">
                {moderationCase.organizerId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400">Créé le</dt>
              <dd className="text-sm text-gray-700">{formatDate(moderationCase.createdAt)}</dd>
            </div>
            {moderationCase.decidedAt && (
              <div>
                <dt className="text-xs font-medium text-gray-400">Décidé le</dt>
                <dd className="text-sm text-gray-700">{formatDate(moderationCase.decidedAt)}</dd>
              </div>
            )}
          </dl>

          {/* Flags */}
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Flag className="h-4 w-4 text-orange-500" />
              Signalements automatiques
            </h2>
            {flags.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun signalement automatique.</p>
            ) : (
              <ul className="space-y-3">
                {flags.map((flag, i) => {
                  const pct = confidencePercent(flag.confidence)
                  return (
                    <li key={i} className="rounded-lg border border-gray-200 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900">{flag.field}</span>
                        <span className="text-xs font-semibold text-gray-600">{pct}%</span>
                      </div>
                      <p className="mb-2 text-sm text-gray-600">{flag.reason}</p>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${confidenceBarColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Admin note / rejection reason */}
          {moderationCase.adminNote && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-xs font-medium text-gray-400">Note de l'administrateur</p>
              <p className="text-sm text-gray-700">{moderationCase.adminNote}</p>
            </div>
          )}
          {moderationCase.rejectionReason && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="mb-1 text-xs font-medium text-red-400">Motif du rejet</p>
              <p className="text-sm text-red-700">{moderationCase.rejectionReason}</p>
            </div>
          )}

          {actionError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {actionError}
            </div>
          )}

          {/* Actions — only for a case still awaiting a decision */}
          {isPending && (
            <div className="flex gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setActionError('')
                  setApproveOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Approuver
              </button>
            </div>
          )}
        </>
      )}

      {/* Approve confirmation dialog */}
      {approveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-dialog-title"
        >
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="approve-dialog-title" className="text-lg font-semibold text-gray-900">
              Approuver ce cas
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              L'événement ou l'annonce sera publié. Vous pouvez ajouter une note interne
              (optionnelle).
            </p>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Note interne (optionnelle)…"
              maxLength={500}
              className="mt-3 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isSubmitting}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApproveOpen(false)}
                disabled={isSubmitting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                disabled={isSubmitting}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Approbation…' : "Confirmer l'approbation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
