const notifications = [
  { id: 1, type: 'Alerte', message: 'Un événement auquel vous êtes inscrit a été modifié.' },
  { id: 2, type: 'Annonce', message: 'Nouvelles activités publiées cette semaine.' },
  { id: 3, type: 'Info', message: 'Votre inscription a été confirmée.' },
]

export default function NotificationsPage() {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      <p className="mt-1 text-sm text-gray-600">Centre des alertes et annonces utilisateur.</p>

      <ul className="mt-6 space-y-3">
        {notifications.map((notification) => (
          <li key={notification.id} className="rounded-md border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
              {notification.type}
            </p>
            <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
