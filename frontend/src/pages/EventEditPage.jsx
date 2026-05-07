import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/ui/button'
import { fetchEventDetail, updateEvent } from '../lib/apiServices'
import { EventFormBody } from '../components/event/EventFormShared'
import { useEventForm } from '../hooks/useEventForm'

function toLocalDatetime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const pad = (v) => String(v).padStart(2, '0')
  // "YYYY-MM-DDTHH:mm" format required by datetime-local inputs, using local time
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">
          Confirmer la mise à jour
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Cette action va écraser les données existantes de l'événement. Continuer ?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-pink-600 px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loadingEvent, setLoadingEvent] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useEventForm()
  const {
    setFormData,
    setTags,
    setIsRestricted,
    setSelectedFaculties,
    setSelectedMajors,
    setSelectedDegreeLevels,
    setErrors,
    submitError,
    setSubmitError,
    isSubmitting,
    setIsSubmitting,
    validateForm,
    buildPayload,
  } = form

  // ── Load existing event ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    fetchEventDetail(id)
      .then((event) => {
        const r = event?.restrictedTo
        setFormData({
          title: event.title ?? '',
          category: event.category ?? '',
          time: toLocalDatetime(event.time),
          endTime: toLocalDatetime(event.endTime),
          place: event.place ?? '',
          capacity: event.capacity != null ? String(event.capacity) : '',
          description: event.description ?? '',
        })
        setTags(event.tags ?? [])
        if (r && (r.faculties?.length || r.majors?.length || r.degreeLevels?.length)) {
          setIsRestricted(true)
          setSelectedFaculties(r.faculties ?? [])
          setSelectedMajors(r.majors ?? [])
          setSelectedDegreeLevels(r.degreeLevels ?? [])
        }
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingEvent(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmitClick(e) {
    e.preventDefault()
    setSubmitError('')
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setShowConfirm(true)
  }

  async function doUpdate() {
    setShowConfirm(false)
    setIsSubmitting(true)
    try {
      await updateEvent(id, buildPayload())
      navigate('/my-events')
    } catch (err) {
      const status = err?.cause?.response?.status ?? err?.response?.status
      if (status === 403)
        setSubmitError("Accès refusé : vous n'êtes pas l'organisateur de cet événement.")
      else if (status === 401) setSubmitError('Session expirée. Veuillez vous reconnecter.')
      else if (status === 404) setSubmitError('Événement introuvable.')
      else setSubmitError(err.message || 'Une erreur est survenue lors de la mise à jour.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────
  if (loadingEvent) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-gray-500">Chargement de l'événement…</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-red-600">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Retour
        </button>
      </section>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {showConfirm && <ConfirmDialog onConfirm={doUpdate} onCancel={() => setShowConfirm(false)} />}

      <section className="mx-auto w-full max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Éditer l'événement</h1>
        <p className="mt-1 text-sm text-gray-600">Modifiez les informations puis enregistrez.</p>

        {submitError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmitClick} noValidate>
          <EventFormBody form={form} />

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-pink-600 hover:opacity-95 disabled:opacity-60"
            >
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
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
    </>
  )
}
