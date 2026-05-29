import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Flag } from 'lucide-react'
import { fetchModerationCase } from '../lib/apiServices'

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

  const { data: moderationCase, isLoading, error } = useQuery({
    queryKey: ['moderationCase', caseId],
    queryFn: () => fetchModerationCase(caseId),
  })

  const flags = moderationCase?.flags ?? []
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
        </>
      )}
    </div>
  )
}
