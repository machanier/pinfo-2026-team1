import { useParams } from 'react-router-dom'
import Button from '../components/ui/button'

export default function EventEditPage() {
  const { id } = useParams()
  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Edition evenement #{id}</h1>
      <p className="mt-1 text-sm text-gray-600">Mise a jour des informations d'un evenement.</p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
            Titre
          </label>
          <input
            id="title"
            type="text"
            defaultValue="Titre actuel"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows="5"
            defaultValue="Description actuelle"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
          />
        </div>

        <Button type="submit" className="bg-pink-600 hover:opacity-95">
          Enregistrer
        </Button>
      </form>
    </section>
  )
}
