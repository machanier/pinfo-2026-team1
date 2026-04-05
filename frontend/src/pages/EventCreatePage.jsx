import Button from '../components/ui/button'

export default function EventCreatePage() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Creation d'un evenement</h1>
      <p className="mt-1 text-sm text-gray-600">Formulaire reserve aux organisateurs.</p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
              Titre
            </label>
            <input
              id="title"
              type="text"
              placeholder="Ex: Job Dating Tech"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
              Categorie
            </label>
            <input
              id="category"
              type="text"
              placeholder="Conference"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="eventDate" className="mb-1 block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              id="eventDate"
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
              Lieu
            </label>
            <input
              id="location"
              type="text"
              placeholder="Amphi A"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-gray-700">
              Capacite
            </label>
            <input
              id="capacity"
              type="number"
              min="1"
              placeholder="200"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="deadline" className="mb-1 block text-sm font-medium text-gray-700">
              Date limite d'inscription
            </label>
            <input
              id="deadline"
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            rows="5"
            placeholder="Programme, intervenants, informations pratiques..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
          />
        </div>

        <Button type="submit" className="bg-pink-600 hover:opacity-95">
          Publier l'evenement
        </Button>
      </form>
    </section>
  )
}
