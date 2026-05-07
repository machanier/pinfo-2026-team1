import Button from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { createEvent } from '../lib/apiServices'
import { FACULTY_OPTIONS, DEGREE_LEVELS, DEGREE_LABELS } from '../lib/universityData'
import { FormField, CheckboxList } from '../components/event/EventFormShared'
import { useEventForm } from '../hooks/useEventForm'

export default function EventCreatePage() {
  const navigate = useNavigate()

  const {
    formData,
    tagInput,
    setTagInput,
    tags,
    isRestricted,
    setIsRestricted,
    selectedFaculties,
    selectedMajors,
    selectedDegreeLevels,
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
