import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../components/ui/button'
import { fetchEventDetail, updateEvent } from '../lib/apiServices'
import { FACULTY_OPTIONS, PROGRAM_OPTIONS_BY_FACULTY } from '../lib/universityData'

const DEGREE_LEVELS = ['BACHELOR', 'MASTER', 'PHD']
const DEGREE_LABELS = { BACHELOR: 'Bachelor', MASTER: 'Master', PHD: 'Doctorat (PhD)' }

function toLocalDatetime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  // "YYYY-MM-DDTHH:mm" format required by datetime-local inputs
  return d.toISOString().slice(0, 16)
}

function FormField({ id, label, required, optionalLabel, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}{' '}
        {required && <span className="text-red-500">*</span>}
        {optionalLabel && <span className="text-gray-400 font-normal">{optionalLabel}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function CheckboxList({ options, selected, onToggle, labelFn = (x) => x, spanClass, labelClass, inputClass }) {
  return options.map((opt) => (
    <label key={opt} className={labelClass ?? 'flex items-center gap-2 cursor-pointer py-0.5'}>
      <input
        type="checkbox"
        checked={selected.includes(opt)}
        onChange={() => onToggle(opt)}
        className={inputClass ?? 'h-4 w-4 shrink-0 rounded border-gray-300 text-pink-600 focus:ring-pink-500'}
      />
      <span className={spanClass ?? 'text-xs text-gray-700 leading-snug'}>{labelFn(opt)}</span>
    </label>
  ))
}

function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">Confirmer la mise à jour</h2>
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

  const [formData, setFormData] = useState({
    title: '', category: '', time: '', endTime: '', place: '', capacity: '', description: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [isRestricted, setIsRestricted] = useState(false)
  const [selectedFaculties, setSelectedFaculties] = useState([])
  const [selectedMajors, setSelectedMajors] = useState([])
  const [selectedDegreeLevels, setSelectedDegreeLevels] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
  }, [id])

  const availableMajors = [
    ...new Set(selectedFaculties.flatMap((f) => PROGRAM_OPTIONS_BY_FACULTY[f] || [])),
  ]

  // ── Validation ───────────────────────────────────────────────────────────
  function validateForm() {
    const e = {}
    if (!formData.title?.trim()) e.title = 'Le titre est requis'
    if (!formData.place?.trim()) e.place = 'Le lieu est requis'
    if (!formData.time) e.time = 'La date de debut est requise'
    if (!formData.category?.trim()) e.category = 'La catégorie est requise'
    if (!formData.description?.trim()) e.description = 'La description est requise'
    if (!formData.capacity || Number(formData.capacity) < 1)
      e.capacity = 'La capacité doit être ≥ 1'
    if (formData.time && formData.endTime && new Date(formData.endTime) <= new Date(formData.time))
      e.endTime = 'La date de fin doit être après la date de début'
    return e
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function addTag(value) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) setTags((prev) => [...prev, trimmed])
    setTagInput('')
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
  }

  function removeTag(tag) { setTags((prev) => prev.filter((t) => t !== tag)) }

  function toggleFaculty(faculty) {
    setSelectedFaculties((prev) => {
      const next = prev.includes(faculty) ? prev.filter((f) => f !== faculty) : [...prev, faculty]
      const nextAvailable = new Set(next.flatMap((f) => PROGRAM_OPTIONS_BY_FACULTY[f] || []))
      setSelectedMajors((m) => m.filter((maj) => nextAvailable.has(maj)))
      return next
    })
  }

  function toggleMajor(major) {
    setSelectedMajors((prev) => prev.includes(major) ? prev.filter((m) => m !== major) : [...prev, major])
  }

  function toggleDegreeLevel(level) {
    setSelectedDegreeLevels((prev) => prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level])
  }

  function handleSubmitClick(e) {
    e.preventDefault()
    setSubmitError('')
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setShowConfirm(true)
  }

  async function doUpdate() {
    setShowConfirm(false)
    setIsSubmitting(true)
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        place: formData.place.trim(),
        time: new Date(formData.time).toISOString(),
        ...(formData.endTime && { endTime: new Date(formData.endTime).toISOString() }),
        ...(formData.capacity !== '' && { capacity: parseInt(formData.capacity, 10) }),
        ...(formData.category.trim() && { category: formData.category.trim() }),
        tags,
        ...(isRestricted && {
          restrictedTo: {
            faculties: selectedFaculties,
            majors: selectedMajors,
            degreeLevels: selectedDegreeLevels,
          },
        }),
      }
      await updateEvent(id, payload)
      navigate('/my-events')
    } catch (err) {
      const status = err?.cause?.response?.status ?? err?.response?.status
      if (status === 403) setSubmitError("Accès refusé : vous n’êtes pas l’organisateur de cet événement.")
      else if (status === 401) setSubmitError('Session expirée. Veuillez vous reconnecter.')
      else if (status === 404) setSubmitError('Événement introuvable.')
      else setSubmitError(err.message || "Une erreur est survenue lors de la mise à jour.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function fieldCls(hasError) {
    return (
      'w-full rounded-md border px-3 py-2 text-sm focus:outline-none ' +
      (hasError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-pink-500')
    )
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
      {showConfirm && (
        <ConfirmDialog onConfirm={doUpdate} onCancel={() => setShowConfirm(false)} />
      )}

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
            <legend className="text-base font-semibold text-gray-800">Informations générales</legend>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField id="title" label="Titre" required error={errors.title}>
                <input id="title" name="title" type="text" placeholder="Ex: Job Dating Tech"
                  value={formData.title} onChange={handleChange} className={fieldCls(errors.title)} />
              </FormField>

              <FormField id="category" label="Catégorie" required error={errors.category}>
                <input id="category" name="category" type="text" placeholder="Conférence"
                  value={formData.category} onChange={handleChange} className={fieldCls(errors.category)} />
              </FormField>

              <FormField id="place" label="Lieu" required error={errors.place}>
                <input id="place" name="place" type="text" placeholder="Amphi A"
                  value={formData.place} onChange={handleChange} className={fieldCls(errors.place)} />
              </FormField>

              <FormField id="capacity" label="Capacité" required error={errors.capacity}>
                <input id="capacity" name="capacity" type="number" min="1" placeholder="200"
                  value={formData.capacity} onChange={handleChange} className={fieldCls(errors.capacity)} />
              </FormField>

              <FormField id="time" label="Date et heure de début" required error={errors.time}>
                <input id="time" name="time" type="datetime-local"
                  value={formData.time} onChange={handleChange} className={fieldCls(errors.time)} />
              </FormField>

              <FormField id="endTime" label="Date et heure de fin" optionalLabel="(optionnel)" error={errors.endTime}>
                <input id="endTime" name="endTime" type="datetime-local"
                  value={formData.endTime} onChange={handleChange} className={fieldCls(errors.endTime)} />
              </FormField>
            </div>

            <FormField id="description" label="Description" required error={errors.description}>
              <textarea id="description" name="description" rows="5"
                placeholder="Programme, intervenants, informations pratiques..."
                value={formData.description} onChange={handleChange} className={fieldCls(errors.description)} />
            </FormField>

            {/* Tags */}
            <div>
              <label htmlFor="tagInput" className="mb-1 block text-sm font-medium text-gray-700">
                Tags <span className="text-gray-400 font-normal">(Entrée pour valider)</span>
              </label>
              {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}
                        className="ml-0.5 text-pink-500 hover:text-pink-800 leading-none"
                        aria-label={'Supprimer le tag ' + tag}>
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input id="tagInput" type="text" placeholder="emploi, tech, networking..."
                value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} className={fieldCls(false)} />
            </div>
          </fieldset>

          {/* Restrictions */}
          <fieldset className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <input id="isRestricted" type="checkbox" checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
              <label htmlFor="isRestricted" className="text-base font-semibold text-gray-800 cursor-pointer">
                Restreindre l’accès aux inscriptions
              </label>
            </div>

            {isRestricted && (
              <div className="ml-7 space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Facultés autorisées <span className="text-gray-400 font-normal">(vide = toutes)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <CheckboxList options={FACULTY_OPTIONS} selected={selectedFaculties} onToggle={toggleFaculty} />
                  </div>
                </div>

                {availableMajors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      Filières autorisées <span className="text-gray-400 font-normal">(vide = toutes)</span>
                    </p>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      <CheckboxList options={availableMajors} selected={selectedMajors} onToggle={toggleMajor} />
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Niveaux de diplôme <span className="text-gray-400 font-normal">(vide = tous)</span>
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
            <Button type="submit" disabled={isSubmitting} className="bg-pink-600 hover:opacity-95 disabled:opacity-60">
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </Button>
            <button type="button" onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
              Annuler
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
