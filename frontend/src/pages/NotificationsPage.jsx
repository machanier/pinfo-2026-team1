import { Bell, CalendarClock, Megaphone, CheckCircle2, Info } from 'lucide-react'

const NOTIFICATIONS = [
  {
    id: 1,
    type: 'alerte',
    title: 'Changement de salle',
    message:
      '« Conférence : IA et société » se tiendra finalement à l’Auditoire U600 (Uni Dufour).',
    time: 'Il y a 1 h',
  },
  {
    id: 2,
    type: 'confirmation',
    title: 'Inscription confirmée',
    message: 'Ta place pour « Tournoi inter-facultés de volleyball » est confirmée. À bientôt !',
    time: 'Hier',
  },
  {
    id: 3,
    type: 'annonce',
    title: 'Nouveaux événements',
    message:
      "L'Orchestre Universitaire et le Career Center viennent de publier de nouveaux événements.",
    time: 'Il y a 2 j',
  },
  {
    id: 4,
    type: 'info',
    title: 'Rappel',
    message: '« Randonnée au Salève » : départ 5h30 au téléphérique, pense à bien t’équiper.',
    time: 'Il y a 3 j',
  },
]

const TYPE_META = {
  alerte: { icon: CalendarClock, badge: 'bg-amber-50 text-amber-600' },
  confirmation: { icon: CheckCircle2, badge: 'bg-green-50 text-green-600' },
  annonce: { icon: Megaphone, badge: 'bg-pink-50 text-pink-600' },
  info: { icon: Info, badge: 'bg-blue-50 text-blue-600' },
}

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Tes alertes et annonces récentes.</p>
        </div>
      </header>

      <ul className="space-y-3">
        {NOTIFICATIONS.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.info
          const Icon = meta.icon
          return (
            <li
              key={n.id}
              className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.badge}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">{n.title}</p>
                  <span className="shrink-0 text-xs text-gray-400">{n.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
