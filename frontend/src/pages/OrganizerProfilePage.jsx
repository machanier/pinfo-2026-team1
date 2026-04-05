import { Link, useParams } from 'react-router-dom'

const organizerEvents = [
  { id: '201', title: 'Forum des associations' },
  { id: '202', title: 'Conférence IA Campus' },
  { id: '203', title: 'Soirée entraide étudiants' },
]

export default function OrganizerProfilePage() {
  const { id } = useParams()

  return (
    <section className="space-y-6">
      <header className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Profil organisateur #{id}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Description de l'association, domaines et contacts.
        </p>
      </header>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Événements publiés</h2>
        <ul className="mt-4 space-y-3">
          {organizerEvents.map((event) => (
            <li key={event.id} className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-gray-800">{event.title}</span>
              <Link
                to={`/events/${event.id}`}
                className="text-sm font-medium text-pink-600 hover:underline"
              >
                Voir
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
