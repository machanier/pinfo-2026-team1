import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useNotificationPreferences } from '../hooks/useNotifications'
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard'

const MASTER_KEY = 'emailEnabled'

// Per-type email toggles governed by the master switch (emailEnabled).
const PER_TYPE_LABELS = {
  emailOnAnnouncement: 'Email pour les annonces',
  emailOnEventUpdate: 'Événements : email lors des mises à jour',
  emailOnEventCancellation: 'Événements : email lors des annulations',
  emailOnRegistrationConfirmed: "Email de confirmation d'inscription",
  emailOnFreeSlot: 'Email quand une place se libère',
}

const REMINDER_OPTIONS = [
  { value: 0, label: 'Désactivé' },
  { value: 1, label: '1 h' },
  { value: 2, label: '2 h' },
  { value: 6, label: '6 h' },
  { value: 12, label: '12 h' },
  { value: 24, label: '24 h' },
  { value: 48, label: '48 h' },
]

function Switch({ checked, disabled, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-pink-600' : 'bg-gray-200'
      } ${disabled ? '' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function NotificationPreferencesPage() {
  const { data: prefs, isLoading, error, update, isUpdating, isUpdateSuccess, updateError } =
    useNotificationPreferences()
  const [local, setLocal] = useState(null)

  const values = local ?? prefs
  // Dirty only when a local edit actually differs from the saved prefs. Toggling a
  // switch and back (or re-picking the same reminder delay) returns to the saved
  // values, so "Enregistrer" should NOT light up.
  const isDirty = local !== null && !!prefs && Object.keys(local).some((k) => local[k] !== prefs[k])
  const masterOn = !!values?.[MASTER_KEY]

  const setField = (key, value) => {
    setLocal((prev) => ({ ...(prev ?? prefs), [key]: value }))
  }
  const toggle = (key) => setField(key, !values[key])

  const save = () => {
    update(values)
    setLocal(null)
  }

  // Block every exit path (refresh/close, sidebar & in-app links, browser Back)
  // while there are unsaved changes — see the hook for the per-path strategy.
  useUnsavedChangesGuard(isDirty)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/notifications"
        className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux notifications
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Préférences de notification</h1>
          <p className="text-sm text-gray-500">Choisis les emails que tu souhaites recevoir.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          Impossible de charger les préférences.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Activer les emails</p>
                <p className="text-xs text-gray-500">
                  Interrupteur principal — coupe tous les emails ci-dessous.
                </p>
              </div>
              <Switch checked={masterOn} onClick={() => toggle(MASTER_KEY)} label="Activer les emails" />
            </div>

            <ul className="mt-4 space-y-3">
              {Object.entries(PER_TYPE_LABELS).map(([key, label]) => (
                <li key={key} className="flex items-center justify-between gap-4">
                  <span className={`text-sm ${masterOn ? 'text-gray-700' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  <Switch
                    checked={masterOn && !!values?.[key]}
                    disabled={!masterOn}
                    onClick={() => toggle(key)}
                    label={label}
                  />
                </li>
              ))}
            </ul>

            {values?.reminderLeadTimeHours !== undefined && (
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-700">Rappel avant l'événement</span>
                <select
                  aria-label="Délai de rappel avant l'événement"
                  value={values.reminderLeadTimeHours}
                  onChange={(e) => setField('reminderLeadTimeHours', Number(e.target.value))}
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div aria-live="polite" className="text-sm">
              {updateError ? (
                <span className="inline-flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Échec de l'enregistrement. Réessaie.
                </span>
              ) : (
                !isDirty &&
                isUpdateSuccess && (
                  <span className="inline-flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Préférences enregistrées.
                  </span>
                )
              )}
            </div>
            <button
              type="button"
              onClick={save}
              disabled={isUpdating || !isDirty}
              className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
