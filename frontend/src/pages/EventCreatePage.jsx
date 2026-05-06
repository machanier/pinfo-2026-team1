import Button from '../components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEvent } from '../lib/apiServices'

const FACULTY_OPTIONS = [
  'Faculte des sciences',
  'Faculte de medecine',
  'Faculte des lettres',
  'Faculte des sciences de la societe (SdS)',
  "Faculte d'economie et de management (GSEM)",
  'Faculte de droit',
  'Faculte de theologie',
  "Faculte de psychologie et des sciences de l'education (FPSE)",
  "Faculte de traduction et d'interpretation (FTI)",
  'Global Studies Institute (GSI)',
  "Centre universitaire d'informatique (CUI)",
  "Institut des sciences de l'environnement (ISE)",
  'Institut universitaire de formation des enseignants (IUFE)',
]

const PROGRAM_OPTIONS_BY_FACULTY = {
  'Faculte des sciences': [
    'Mathematiques',
    'Sciences informatiques',
    'Physique',
    'Chimie et Biochimie',
    'Biologie',
    "Sciences de la Terre et de l'environnement",
    'Sciences pharmaceutiques',
  ],
  'Faculte de medecine': [
    'Medecine humaine',
    'Medecine dentaire',
    'Sciences du mouvement et du sport (Education physique)',
  ],
  "Faculte d'economie et de management (GSEM)": [
    "Management / Gestion d'entreprise",
    'Economie',
    'Finance',
    'Statistique',
    'Science des donnees (Data Science)',
  ],
  'Faculte de droit': ['Droit suisse', 'Droit international et europeen', 'Droit economique'],
  'Faculte des sciences de la societe (SdS)': [
    'Science politique',
    'Sociologie',
    'Geographie et environnement',
    'Histoire, economie et societe',
    'Etudes genre',
  ],
  'Global Studies Institute (GSI)': ['Relations internationales', 'Etudes europeennes'],
  "Faculte de psychologie et des sciences de l'education (FPSE)": [
    'Psychologie',
    "Sciences de l'education",
    'Logopedie',
  ],
  'Faculte des lettres': [
    'Langues et litteratures',
    'Histoire',
    "Histoire de l'art",
    'Philosophie',
    "Sciences de l'Antiquite",
    'Archeologie',
  ],
  "Faculte de traduction et d'interpretation (FTI)": [
    'Traduction',
    'Interpretation de conference',
    'Technologies de la traduction / Communication multilingue',
  ],
  'Faculte de theologie': ['Theologie protestante'],
  "Centre universitaire d'informatique (CUI)": ['Sciences informatiques'],
  "Institut des sciences de l'environnement (ISE)": ["Sciences de la Terre et de l'environnement"],
  'Institut universitaire de formation des enseignants (IUFE)': ['Formation des enseignants'],
}

const DEGREE_LEVELS = ['BACHELOR', 'MASTER', 'PHD']
const DEGREE_LABELS = { BACHELOR: 'Bachelor', MASTER: 'Master', PHD: 'Doctorat (PhD)' }

function FormField({ id, label, required, optionalLabel, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
        {optionalLabel && <span className="text-gray-400 font-normal">{optionalLabel}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function CheckboxList({
  options,
  selected,
  onToggle,
  labelFn = (x) => x,
  spanClass,
  labelClass,
  inputClass,
}) {
  return options.map((opt) => (
    <label key={opt} className={labelClass ?? 'flex items-center gap-2 cursor-pointer py-0.5'}>
      <input
        type="checkbox"
        checked={selected.includes(opt)}
        onChange={() => onToggle(opt)}
        className={
          inputClass ?? 'h-4 w-4 shrink-0 rounded border-gray-300 text-pink-600 focus:ring-pink-500'
        }
      />
      <span className={spanClass ?? 'text-xs text-gray-700 leading-snug'}>{labelFn(opt)}</span>
    </label>
  ))
}

export default function EventCreatePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    time: '',
    endTime: '',
    place: '',
    capacity: '',
    description: '',
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

  // Majors available = union of programs for all selected faculties
  const availableMajors = [
    ...new Set(selectedFaculties.flatMap((f) => PROGRAM_OPTIONS_BY_FACULTY[f] || [])),
  ]

  // ── Validation ──────────────────────────────────────────────────────────
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
      e.endTime = 'La date de fin doit etre apres la date de debut'
    return e
  }

  // ── Handlers ────────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function addTag(value) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function toggleFaculty(faculty) {
    setSelectedFaculties((prev) => {
      const next = prev.includes(faculty) ? prev.filter((f) => f !== faculty) : [...prev, faculty]
      // Drop majors no longer reachable from the new faculty selection
      const nextAvailable = new Set(next.flatMap((f) => PROGRAM_OPTIONS_BY_FACULTY[f] || []))
      setSelectedMajors((m) => m.filter((maj) => nextAvailable.has(maj)))
      return next
    })
  }

  function toggleMajor(major) {
    setSelectedMajors((prev) =>
      prev.includes(major) ? prev.filter((m) => m !== major) : [...prev, major],
    )
  }

  function toggleDegreeLevel(level) {
    setSelectedDegreeLevels((prev) =>
      prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level],
    )
  }

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
      await createEvent(payload)
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

  function fieldCls(hasError) {
    return (
      'w-full rounded-md border px-3 py-2 text-sm focus:outline-none ' +
      (hasError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-pink-500')
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
        {/* Informations generales */}
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold text-gray-800">Informations generales</legend>

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

            <FormField id="category" label="Categorie" required error={errors.category}>
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

            <FormField id="capacity" label="Capacite" required error={errors.capacity}>
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

            <FormField id="time" label="Date et heure de debut" required error={errors.time}>
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

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows="5"
              placeholder="Programme, intervenants, informations pratiques..."
              value={formData.description}
              onChange={handleChange}
              className={fieldCls(errors.description)}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Tags — chip input */}
          <div>
            <label htmlFor="tagInput" className="mb-1 block text-sm font-medium text-gray-700">
              Tags{' '}
              <span className="text-gray-400 font-normal">(appuyer sur Entree pour valider)</span>
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
            <p className="mt-1 text-xs text-gray-400">
              Tapez un tag et appuyez sur Entree pour l'ajouter.
            </p>
          </div>
        </fieldset>

        {/* Regle d'eligibilite */}
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
              Restreindre l'acces aux inscriptions
            </label>
          </div>
          <p className="text-xs text-gray-500 ml-7">
            Seuls les etudiants correspondant a tous les criteres selectionnes pourront s'inscrire.
            Ne rien selectionner dans une section signifie tous acceptes pour cette dimension.
          </p>

          {isRestricted && (
            <div className="ml-7 space-y-6">
              {/* Facultes */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Facultes autorisees{' '}
                  <span className="text-gray-400 font-normal">(vide = toutes facultes)</span>
                </p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <CheckboxList
                    options={FACULTY_OPTIONS}
                    selected={selectedFaculties}
                    onToggle={toggleFaculty}
                  />
                </div>
              </div>

              {/* Filieres — affichees seulement si au moins une faculte selectionnee */}
              {availableMajors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Filieres autorisees{' '}
                    <span className="text-gray-400 font-normal">(vide = toutes filieres)</span>
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

              {/* Niveaux de diplome */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Niveaux de diplome autorises{' '}
                  <span className="text-gray-400 font-normal">(vide = tous niveaux)</span>
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

        {/* Soumission */}
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
