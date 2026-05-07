import Button from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { createEvent } from '../lib/apiServices'
import { EventFormBody } from '../components/event/EventFormShared'
import { useEventForm } from '../hooks/useEventForm'

export default function EventCreatePage() {
  const navigate = useNavigate()
  const form = useEventForm()
  const {
    setErrors,
    setSubmitError,
    setIsSubmitting,
    isSubmitting,
    submitError,
    validateForm,
    buildPayload,
  } = form

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await createEvent(buildPayload())
      navigate('/my-events')
    } catch (err) {
      const status = err?.cause?.response?.status
      if (status === 403) setSubmitError("Acces refuse : votre compte n'a pas le role ORGANIZER.")
      else if (status === 401) setSubmitError('Session expiree. Veuillez vous reconnecter.')
      else
        setSubmitError(err.message || "Une erreur est survenue lors de la creation de l'evenement.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Création d'un événement</h1>
      <p className="mt-1 text-sm text-gray-600">Formulaire réservé aux organisateurs.</p>

      {submitError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <form className="mt-6 space-y-6" onSubmit={handleSubmit} noValidate>
        <EventFormBody form={form} />

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-pink-600 hover:opacity-95 disabled:opacity-60"
          >
            {isSubmitting ? 'Création en cours…' : "Publier l'événement"}
          </Button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Annuler
          </button>
        </div>
      </form>
    </section>
  )
}
