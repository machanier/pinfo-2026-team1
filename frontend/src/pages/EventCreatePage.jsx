import Button from '../components/ui/button'
import { useState } from 'react'

export default function EventCreatePage() {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    eventDate: '',
    location: '',
    capacity: '',
    deadline: '',
    description: '',
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  function validateForm() {
    const newErrors = {}
    if (!formData.title?.trim()) newErrors.title = 'Le titre est requis'
    if (!formData.category?.trim()) newErrors.category = 'La catégorie est requise'
    if (!formData.eventDate) newErrors.eventDate = 'La date est requise'
    if (!formData.location?.trim()) newErrors.location = 'Le lieu est requis'
    if (!formData.capacity || formData.capacity < 1)
      newErrors.capacity = 'La capacité doit être ≥ 1'
    if (!formData.deadline) newErrors.deadline = 'La date limite est requise'
    if (!formData.description?.trim()) newErrors.description = 'La description est requise'

    if (new Date(formData.eventDate) <= new Date(formData.deadline)) {
      newErrors.deadline = "La date limite doit être avant la date de l'événement"
    }

    return newErrors
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const newErrors = validateForm()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSuccessMessage('Événement créé avec succès!')
    setFormData({
      title: '',
      category: '',
      eventDate: '',
      location: '',
      capacity: '',
      deadline: '',
      description: '',
    })

    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Création d'un événement</h1>
      <p className="mt-1 text-sm text-gray-600">Formulaire réservé aux organisateurs.</p>

      {successMessage && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
              Titre *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Ex: Job Dating Tech"
              value={formData.title}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.title
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
              Catégorie *
            </label>
            <input
              id="category"
              name="category"
              type="text"
              placeholder="Conférence"
              value={formData.category}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.category
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="eventDate" className="mb-1 block text-sm font-medium text-gray-700">
              Date *
            </label>
            <input
              id="eventDate"
              name="eventDate"
              type="date"
              value={formData.eventDate}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.eventDate
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.eventDate && <p className="mt-1 text-xs text-red-600">{errors.eventDate}</p>}
          </div>

          <div>
            <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
              Lieu *
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Amphi A"
              value={formData.location}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.location
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
          </div>

          <div>
            <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-gray-700">
              Capacité *
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              placeholder="200"
              value={formData.capacity}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.capacity
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.capacity && <p className="mt-1 text-xs text-red-600">{errors.capacity}</p>}
          </div>

          <div>
            <label htmlFor="deadline" className="mb-1 block text-sm font-medium text-gray-700">
              Date limite d'inscription *
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              value={formData.deadline}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.deadline
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.deadline && <p className="mt-1 text-xs text-red-600">{errors.deadline}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            rows="5"
            placeholder="Programme, intervenants, informations pratiques..."
            value={formData.description}
            onChange={handleChange}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              errors.description
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 focus:border-pink-500'
            }`}
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>

        <Button type="submit" className="bg-pink-600 hover:opacity-95">
          Publier l'événement
        </Button>
      </form>
    </section>
  )
}
