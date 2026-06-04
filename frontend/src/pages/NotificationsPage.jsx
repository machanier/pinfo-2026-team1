import { useState } from 'react'
import {
  Bell,
  CalendarClock,
  Megaphone,
  CheckCircle2,
  Info,
  CheckCheck,
  Settings,
  Loader2,
  AlertCircle,
  BellOff,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useNotifications, useNotificationPreferences } from '../hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPE_META = {
  REGISTRATION_CONFIRMED: {
    label: 'Inscription',
    icon: CheckCircle2,
    badge: 'bg-green-50 text-green-600',
  },
  REGISTRATION_CANCELLED: {
    label: 'Annulation',
    icon: CalendarClock,
    badge: 'bg-amber-50 text-amber-600',
  },
  WAITLIST_PROMOTED: {
    label: "Liste d'attente",
    icon: CheckCircle2,
    badge: 'bg-green-50 text-green-600',
  },
  EVENT_UPDATED: { label: 'Mise à jour', icon: CalendarClock, badge: 'bg-amber-50 text-amber-600' },
  EVENT_CANCELLED: {
    label: 'Annulation',
    icon: CalendarClock,
    badge: 'bg-amber-50 text-amber-600',
  },
  ANNOUNCEMENT: { label: 'Annonce', icon: Megaphone, badge: 'bg-pink-50 text-pink-600' },
  REMINDER: { label: 'Rappel', icon: Info, badge: 'bg-blue-50 text-blue-600' },
  SLOT_AVAILABLE: {
    label: 'Place disponible',
    icon: CheckCircle2,
    badge: 'bg-green-50 text-green-600',
  },
}

const FILTER_TABS = [
  { key: undefined, label: 'Toutes' },
  { key: false, label: 'Non lues' },
  { key: true, label: 'Lues' },
]

const PREFERENCE_LABELS = {
  emailEnabled: 'Activer les emails',
  emailOnAnnouncement: 'Email pour les annonces',
  emailOnEventUpdate: 'Événements : email lors des mises à jour',
  emailOnEventCancellation: 'Événements : email lors des annulations',
  emailOnRegistrationConfirmed: "Email de confirmation d'inscription",
  emailOnFreeSlot: 'Email quand une place se libère',
}

function MockBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
      <span>
        <strong>Service de notifications indisponible</strong> — données de démonstration affichées.
        Les actions (marquer comme lu, préférences) n'ont aucun effet.
      </span>
    </div>
  )
}

function NotificationSkeleton() {
  return (
    <li className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
      </div>
    </li>
  )
}

function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
      <BellOff className="h-10 w-10" />
      <p className="text-sm font-medium">
        {filtered
          ? 'Aucune notification dans cette catégorie.'
          : "Tu n'as aucune notification pour l'instant."}
      </p>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-8 text-red-500">
      <AlertCircle className="h-8 w-8" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs text-red-400">
        Le service de notifications est peut-être temporairement indisponible.
      </p>
    </div>
  )
}

function NotificationItem({ notification, onMarkRead, isMarking }) {
  const meta = TYPE_META[notification.type] ?? TYPE_META.REMINDER
  const Icon = meta.icon

  const timeAgo = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })
    : null

  // Only unread cards are actionable (clicking marks them read). Expose the
  // action to keyboard users too — focusable + Enter/Space activation — so the
  // click handler isn't mouse-only (jsx-a11y / Sonar S1082).
  const isActionable = !notification.read
  const markRead = () => {
    if (isActionable) onMarkRead(notification.notificationId)
  }
  const handleKeyDown = (event) => {
    if (isActionable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onMarkRead(notification.notificationId)
    }
  }

  return (
    <li
      className={`flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        notification.read ? 'border-gray-100 opacity-70' : 'cursor-pointer border-pink-100'
      }`}
      onClick={markRead}
      onKeyDown={handleKeyDown}
      role={isActionable ? 'button' : undefined}
      tabIndex={isActionable ? 0 : undefined}
      aria-label={isActionable ? 'Marquer la notification comme lue' : undefined}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.badge}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!notification.read && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-pink-500" aria-label="Non lue" />
            )}
            <p className="font-semibold text-gray-900">{notification.body}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {timeAgo && <span className="text-xs text-gray-400">{timeAgo}</span>}
            {isMarking && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
          </div>
        </div>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>
    </li>
  )
}

function PreferencesPanel({ onClose }) {
  const { data: prefs, isLoading, error, update, isUpdating } = useNotificationPreferences()
  const [local, setLocal] = useState(null)
  const values = local ?? prefs

  const toggle = (key) => {
    setLocal((prev) => ({ ...(prev ?? prefs), [key]: !(prev ?? prefs)[key] }))
  }

  const save = () => {
    update(local)
    setLocal(null)
    onClose()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-500">
        Impossible de charger les préférences.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Préférences de notification</h2>
      <ul className="space-y-3">
        {Object.entries(PREFERENCE_LABELS).map(([key, label]) => (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!values?.[key]}
              onClick={() => toggle(key)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 ${
                values?.[key] ? 'bg-pink-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  values?.[key] ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </li>
        ))}
        {values?.reminderLeadTimeHours !== undefined && (
          <li className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-700">Rappel (heures avant l'événement)</span>
            <select
              value={values.reminderLeadTimeHours}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...(prev ?? prefs),
                  reminderLeadTimeHours: Number(e.target.value),
                }))
              }
              className="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value={0}>Désactivé</option>
              <option value={1}>1 h</option>
              <option value={2}>2 h</option>
              <option value={6}>6 h</option>
              <option value={12}>12 h</option>
              <option value={24}>24 h</option>
              <option value={48}>48 h</option>
            </select>
          </li>
        )}
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isUpdating || !local}
          className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const [readFilter, setReadFilter] = useState(undefined)
  const [page, setPage] = useState(0)
  const [showPrefs, setShowPrefs] = useState(false)
  const [markingId, setMarkingId] = useState(null)

  const handleSetReadFilter = (value) => {
    setReadFilter(value)
    setPage(0)
  }

  const { data, isLoading, isMock, markRead, markAllRead, isMarkingAllRead } = useNotifications({
    read: readFilter,
    page,
  })

  const notifications = data?.content ?? []
  const unreadCount = data?.unreadCount ?? 0
  const isFiltered = readFilter !== undefined

  const handleMarkRead = (id) => {
    setMarkingId(id)
    markRead(id)
    setTimeout(() => setMarkingId(null), 1000)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-pink-600 px-2 text-sm font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">Tes alertes et annonces récentes.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={isMarkingAllRead}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {isMarkingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Tout marquer comme lu
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPrefs((v) => !v)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-50 ${
              showPrefs ? 'border-pink-300 bg-pink-50 text-pink-600' : 'border-gray-200'
            }`}
            title="Préférences"
            aria-label="Préférences de notification"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {isMock && <MockBanner />}

      {showPrefs && <PreferencesPanel onClose={() => setShowPrefs(false)} />}

      <div className="flex gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={String(tab.key)}
            type="button"
            onClick={() => handleSetReadFilter(tab.key)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
              readFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </ul>
      )}

      {!isLoading && !isMock && notifications.length === 0 && <EmptyState filtered={isFiltered} />}

      {!isLoading && notifications.length > 0 && (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <NotificationItem
              key={n.notificationId}
              notification={n}
              onMarkRead={handleMarkRead}
              isMarking={markingId === n.notificationId}
            />
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <nav
          aria-label="Pagination des notifications"
          className="flex items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
            Préc.
          </button>

          <span className="text-sm text-gray-500">
            {page + 1} / {data.totalPages}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
            disabled={page >= data.totalPages - 1}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Page suivante"
          >
            Suiv.
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  )
}
