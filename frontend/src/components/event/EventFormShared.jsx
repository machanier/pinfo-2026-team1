import { FACULTY_OPTIONS, DEGREE_LEVELS, DEGREE_LABELS } from '../../lib/universityData'
import BannerUpload from './BannerUpload'
import { EVENT_CATEGORIES } from '../../lib/categories'

export function FormField({ id, label, required, optionalLabel, error, children }) {
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

export function CheckboxList({
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

export function EventFormBody({ form }) {
  const {
    formData,
    handleChange,
    fieldCls,
    errors,
    tagInput,
    setTagInput,
    tags,
    removeTag,
    handleTagKeyDown,
    isRestricted,
    setIsRestricted,
    selectedFaculties,
    selectedMajors,
    selectedDegreeLevels,
    availableMajors,
    toggleFaculty,
    toggleMajor,
    toggleDegreeLevel,
    bannerImageUrl,
    setBannerImageUrl,
    isSubmitting,
  } = form

  return (
    <>
      {/* Banner */}
      <fieldset className="space-y-2">
        <legend className="text-base font-semibold text-gray-800">
          Bannière <span className="text-gray-400 font-normal text-sm">(optionnel)</span>
        </legend>
        <BannerUpload value={bannerImageUrl} onChange={setBannerImageUrl} disabled={isSubmitting} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-gray-800">Informations générales</legend>

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
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={fieldCls(errors.category)}
            >
              <option value="" disabled>
                Choisis une catégorie…
              </option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {formData.category && !EVENT_CATEGORIES.includes(formData.category) && (
                <option value={formData.category}>{formData.category}</option>
              )}
            </select>
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
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)}
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
            Restreindre l&apos;accès aux inscriptions
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
    </>
  )
}
