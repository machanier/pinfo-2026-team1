import { useParams } from 'react-router-dom'
import Button from '../components/ui/button'

export default function EventDetailPage() {
  const { id } = useParams()

  return (
    <section className="space-y-6">
      <header className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Details de l'evenement #{id}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Page de detail avec informations completes, horaires, capacite et organisateur.
        </p>
      </header>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button>Consulter</Button>
          <Button className="bg-pink-600 hover:opacity-95">S'abonner</Button>
        </div>
      </div>
    </section>
  )
}
