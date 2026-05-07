import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/ui/button'
import { fetchEventDetail, updateEvent } from '../lib/apiServices'
import { FACULTY_OPTIONS, DEGREE_LEVELS, DEGREE_LABELS } from '../lib/universityData'
import { FormField, CheckboxList } from '../components/event/EventFormShared'
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
          Cette action va écraser les données existantes de l’événement. Continuer ?
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

  const {
    formData,
    setFormData,
    tagInput,
    setTagInput,
    tags,
    setTags,
    isRestricted,
    setIsRestricted,
    selectedFaculties,
    setSelectedFaculties,
    selectedMajors,
    setSelectedMajors,
    selectedDegreeLevels,
    setSelectedDegreeLevels,
    availableMajors,
    errors,
    setErrors,
    submitError,
    setSubmitError,
    isSubmitting,
    setIsSubmitting,
    validateForm,
    handleChange,
    handleTagKeyDown,
    removeTag,
    toggleFaculty,
    toggleMajor,
    toggleDegreeLevel,
    fieldCls,
    buildPayload,
  } = useEventForm()

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
        setSubmitError('Accès refusé : vous n’êtes pas l’organisateur de cet événement.')
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
        <p className="text-gray-500">Chargement de l’événement…</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Éditer l’événement</h1>
        <p className="mt-1 text-sm text-gray-600">Modifiez les informations puis enregistrez.</p>

        {submitError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmitClick} noValidate>
          <fieldset className="space-y-4">
            <legend className="text-base font-semibold text-gray-800">
              Informations générales
            </legend>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField id="title" label="Titre" required error={errors.title}>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Ex: Job Dating Tech"
                  value={formData.title}
                  onChange={handleChange}
                  className={fieldCls(errors.title)}
                />
              </FormField>

              <FormField id="category" label="Catégorie" required error={errors.category}>
                <input
                  id="category"
                  name="category"
                  type="text"
                  placeholder="Conférence"
                  value={formData.category}
                  onChange={handleChange}
                  className={fieldCls(errors.category)}
                />
              </FormField>

              <FormField id="place" label="Lieu" required error={errors.place}>
                <input
                  id="place"
                  name="place"
                  type="text"
                  placeholder="Amphi A"
                  value={formData.place}
                  onChange={handleChange}
                  className={fieldCls(errors.place)}
                />
              </FormField>

              <FormField id="capacity" label="Capacité" required error={errors.capacity}>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  placeholder="200"
                  value={formData.capacity}
                  onChange={handleChange}
                  className={fieldCls(errors.capacity)}
                />
              </FormField>

              <FormField id="time" label="Date et heure de début" required error={errors.time}>
                <input
                  id="time"
                  name="time"
                  type="datetime-local"
                  value={formData.time}
                  onChange={handleChange}
                  className={fieldCls(errors.time)}
                />
              </FormField>

              <FormField
                id="endTime"
                label="Date et heure de fin"
                optionalLabel="(optionnel)"
                error={errors.endTime}
              >
                <input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={handleChange}
                  className={fieldCls(errors.endTime)}
                />
              </FormField>
            </div>

            <FormField id="description" label="Description" required error={errors.description}>
              <textarea
                id="description"
                name="description"
                rows="5"
                placeholder="Programme, intervenants, informations pratiques..."
                value={formData.description}
                onChange={handleChange}
                className={fieldCls(errors.description)}
              />
            </FormField>

            {/* Tags */}
            <div>
              <label htmlFor="tagInput" className="mb-1 block text-sm font-medium text-gray-700">
                Tags <span className="text-gray-400 font-normal">(Entrée pour valider)</span>
              </label>
              {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 text-pink-500 hover:text-pink-800 leading-none"
                        aria-label={'Supprimer le tag ' + tag}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="tagInput"
                type="text"
                placeholder="emploi, tech, networking..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className={fieldCls(false)}
              />
            </div>
          </fieldset>

          {/* Restrictions */}
          <fieldset className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="isRestricted"
                type="checkbox"
                checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <label
                htmlFor="isRestricted"
                className="text-base font-semibold text-gray-800 cursor-pointer"
              >
                Restreindre l’accès aux inscriptions
              </label>
            </div>

            {isRestricted && (
              <div className="ml-7 space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Facultés autorisées{' '}
                    <span className="text-gray-400 font-normal">(vide = toutes)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <CheckboxList
                      options={FACULTY_OPTIONS}
                      selected={selectedFaculties}
                      onToggle={toggleFaculty}
                    />
                  </div>
                </div>

                {availableMajors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      Filières autorisées{' '}
                      <span className="text-gray-400 font-normal">(vide = toutes)</span>
                    </p>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      <CheckboxList
                        options={availableMajors}
                        selected={selectedMajors}
                        onToggle={toggleMajor}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Niveaux de diplôme{' '}
                    <span className="text-gray-400 font-normal">(vide = tous)</span>
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <CheckboxList
                      options={DEGREE_LEVELS}
                      selected={selectedDegreeLevels}
                      onToggle={toggleDegreeLevel}
                      labelFn={(level) => DEGREE_LABELS[level]}
                      labelClass="flex items-center gap-2 cursor-pointer"
                      inputClass="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      spanClass="text-sm text-gray-700"
                    />
                  </div>
                </div>
              </div>
            )}
          </fieldset>

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
