import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Search,
  MapPin,
  Clock,
  Users,
  Building2,
  X,
  SlidersHorizontal,
  GraduationCap,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { searchEvents, fetchEventSuggestions, searchOrganizers } from '../lib/apiServices'
import { useApp } from '../contexts/useApp'
import { FACULTY_OPTIONS, PROGRAM_OPTIONS_BY_FACULTY, DEGREE_LABELS } from '../lib/universityData'

const SORT_OPTIONS = [
  { value: 'date_asc', label: 'Date (croissante)' },
  { value: 'date_desc', label: 'Date (décroissante)' },
  { value: 'popularity', label: 'Pertinence' },
]

const PAGE_SIZE = 20

function getPageNumbers(current, total) {
  const delta = 1
  const pages = []
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || Math.abs(i - current) <= delta) pages.push(i)
  }
  const result = []
  let prev = null
  for (const p of pages) {
    if (prev !== null && p - prev > 1) result.push('…')
    result.push(p)
    prev = p
  }
  return result
}

// ── Filter sidebar ────────────────────────────────────────────────────────────

function FilterSection({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h3>
      {children}
    </section>
  )
}

function FilterSidebar({
  sort,
  setSort,
  selectedCategories,
  toggleCategory,
  isAdmin,
  status,
  setStatus,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  place,
  setPlace,
  organizer,
  setOrganizer,
  faculty,
  setFaculty,
  major,
  setMajor,
  availableMajors,
  degreeLevel,
  setDegreeLevel,
  hasAvailableSlots,
  setHasAvailableSlots,
  facets,
  onClear,
  hasActiveFilters,
}) {
  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white'

  return (
    <div className="space-y-6">
      {/* Sort */}
      <FilterSection title="Tri">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Catégorie">
        <div className="space-y-1">
          {facets.categories?.map((f) => (
            <label key={f.value} className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  value={f.value}
                  checked={selectedCategories.includes(f.value)}
                  onChange={() => toggleCategory(f.value)}
                  className="accent-pink-600"
                />
                {f.value}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                {f.count}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Date range */}
      <FilterSection title="Période">
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </FilterSection>

      {/* Place */}
      <FilterSection title="Lieu">
        <input
          type="text"
          list="places-datalist"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Ex: Uni Mail, CMU…"
          className={inputCls}
        />
        {facets.places?.length > 0 && (
          <datalist id="places-datalist">
            {facets.places.map((f) => (
              <option key={f.value} value={f.value} />
            ))}
          </datalist>
        )}
      </FilterSection>

      {/* Organizer */}
      <FilterSection title="Organisateur">
        <input
          type="text"
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
          placeholder="ID de l'organisateur…"
          className={inputCls}
        />
      </FilterSection>

      {/* Faculty */}
      <FilterSection title="Faculté">
        <select
          value={faculty}
          onChange={(e) => {
            setFaculty(e.target.value)
          }}
          className={inputCls}
        >
          <option value="">Toutes les facultés</option>
          {FACULTY_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Filière — cascadée depuis la faculté */}
      {availableMajors.length > 0 && (
        <FilterSection title="Filière">
          <select value={major} onChange={(e) => setMajor(e.target.value)} className={inputCls}>
            <option value="">Toutes les filières</option>
            {availableMajors.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </FilterSection>
      )}

      {/* Degree level */}
      <FilterSection title="Niveau d'études">
        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="degreeLevel"
              value=""
              checked={degreeLevel === ''}
              onChange={() => setDegreeLevel('')}
              className="accent-pink-600"
            />
            <span className="text-sm text-gray-700">Tous</span>
          </label>
          {['BACHELOR', 'MASTER', 'PHD'].map((lvl) => {
            const facetCount = facets.degreeLevels?.find((f) => f.value === lvl)?.count
            return (
              <label key={lvl} className="flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="degreeLevel"
                    value={lvl}
                    checked={degreeLevel === lvl}
                    onChange={() => setDegreeLevel(lvl)}
                    className="accent-pink-600"
                  />
                  {DEGREE_LABELS[lvl]}
                </span>
                {facetCount != null && (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                    {facetCount}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </FilterSection>

      {/* Available slots */}
      <FilterSection title="Disponibilité">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            role="switch"
            aria-checked={hasAvailableSlots}
            onClick={() => setHasAvailableSlots(!hasAvailableSlots)}
            className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
              hasAvailableSlots ? 'bg-pink-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                hasAvailableSlots ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </div>
          <span className="text-sm text-gray-700">Places disponibles uniquement</span>
        </label>
      </FilterSection>

      {/* Statut (Admin uniquement) */}
      {isAdmin && (
        <FilterSection title="Statut (Admin)">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="PUBLISHED">Publié</option>
            <option value="DRAFT">Brouillon</option>
          </select>
        </FilterSection>
      )}

      {/* Reset */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-pink-600 hover:border-pink-300 transition-colors"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Local state : seulement pour l'input (frappe immédiate, debounce vers URL)
  const [inputValue, setInputValue] = useState(searchParams.get('q') ?? '')
  const [debouncedSuggestionQuery, setDebouncedSuggestionQuery] = useState(inputValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('events')
  const inputRef = useRef(null)
  const { userRole } = useApp()

  // ── Lecture de l'état depuis l'URL ─────────────────────────────────────────
  const debouncedQuery = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''
  const place = searchParams.get('place') ?? ''
  const organizer = searchParams.get('organizer') ?? ''
  const faculty = searchParams.get('faculty') ?? ''
  const major = searchParams.get('major') ?? ''
  const degreeLevel = searchParams.get('degree') ?? ''
  const hasAvailableSlots = searchParams.get('slots') === '1'
  const sort = searchParams.get('sort') ?? 'date_asc'
  const page = parseInt(searchParams.get('page') ?? '0', 10)
  const isAdmin = userRole === 'ADMIN'
  const status = isAdmin ? (searchParams.get('status') ?? 'PUBLISHED') : 'PUBLISHED'
  const selectedCategories = category ? category.split(',') : []

  // ── Setters URL ────────────────────────────────────────────────────────────
  // Mise à jour générique d'un param, réinitialise la page par défaut
  const setParam = (key, value, resetPage = true) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, String(value))
        else next.delete(key)
        if (resetPage) next.delete('page')
        return next
      },
      { replace: false },
    )

  const toggleCategory = (val) => {
    const next = selectedCategories.includes(val)
      ? selectedCategories.filter((c) => c !== val)
      : [...selectedCategories, val]
    setParam('category', next.join(','))
  }
  const setStatus = (v) => setParam('status', v)
  const setDateFrom = (v) => setParam('from', v)
  const setDateTo = (v) => setParam('to', v)
  const setPlace = (v) => setParam('place', v)
  const setOrganizer = (v) => setParam('organizer', v)
  // setFaculty efface aussi la filière en cascade
  const setFaculty = (v) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (v) next.set('faculty', v)
      else next.delete('faculty')
      next.delete('major')
      next.delete('page')
      return next
    })
  const setMajor = (v) => setParam('major', v)
  const setDegreeLevel = (v) => setParam('degree', v)
  const setHasAvailableSlots = (v) => setParam('slots', v ? '1' : '')
  const setSort = (v) => setParam('sort', v === 'date_asc' ? '' : v)
  const setPage = (n) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (n === 0) next.delete('page')
      else next.set('page', String(n))
      return next
    })

  // ── Effets ─────────────────────────────────────────────────────────────────
  // Debounce 200ms : mise à jour de la requête pour les suggestions d'autocomplétion
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSuggestionQuery(inputValue), 200)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Debounce 400ms : pousse inputValue → param 'q' (replace pour ne pas polluer
  // l'historique avec chaque frappe)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (inputValue) next.set('q', inputValue)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 400)
    return () => clearTimeout(timer)
  }, [inputValue]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll en haut lors d'un changement de page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  // Suggestions d'autocomplétion (sur la valeur debounced à 200ms)
  const { data: suggestionsData } = useQuery({
    queryKey: ['eventSuggestions', debouncedSuggestionQuery],
    queryFn: () => fetchEventSuggestions(debouncedSuggestionQuery),
    enabled: debouncedSuggestionQuery.length >= 2,
    staleTime: 30_000,
  })

  // Recherche principale
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'searchEvents',
      debouncedQuery,
      category,
      dateFrom,
      dateTo,
      place,
      organizer,
      faculty,
      major,
      degreeLevel,
      hasAvailableSlots,
      status,
      sort,
      page,
    ],
    queryFn: () =>
      searchEvents({
        q: debouncedQuery || undefined,
        category: category || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        place: place || undefined,
        organizerId: organizer || undefined,
        faculty: faculty || undefined,
        major: major || undefined,
        degreeLevel: degreeLevel || undefined,
        hasAvailableSlots: hasAvailableSlots || undefined,
        status,
        sort,
        page,
        size: PAGE_SIZE,
      }),
    enabled: activeTab === 'events',
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  })

  const rawEvents = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const totalElements = data?.totalElements ?? 0
  const facets = data?.facets ?? {}
  const suggestions = suggestionsData?.suggestions ?? []
  const events = rawEvents

  const availableMajors = PROGRAM_OPTIONS_BY_FACULTY[faculty] ?? []

  // Recherche d'organisateurs
  const {
    data: organizersData,
    isLoading: isLoadingOrganizers,
    error: organizersError,
  } = useQuery({
    queryKey: ['searchOrganizers', debouncedQuery, page],
    queryFn: () => searchOrganizers({ q: debouncedQuery || undefined, page, size: PAGE_SIZE }),
    enabled: activeTab === 'organizers',
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  })

  const organizers = organizersData?.content ?? []
  const organizersTotalPages = organizersData?.totalPages ?? 0
  const organizersTotalElements = organizersData?.totalElements ?? 0

  const hasActiveFilters = !!(
    inputValue ||
    category ||
    dateFrom ||
    dateTo ||
    place ||
    organizer ||
    faculty ||
    major ||
    degreeLevel ||
    hasAvailableSlots ||
    sort !== 'date_asc'
  )

  const handleSuggestionClick = (s) => {
    setInputValue(s)
    setShowSuggestions(false)
    // Pousse immédiatement sans attendre le debounce
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('q', s)
        next.delete('page')
        return next
      },
      { replace: true },
    )
    inputRef.current?.focus()
  }

  const clearFilters = () => {
    setInputValue('')
    setSearchParams({})
  }

  const filterProps = {
    sort,
    setSort,
    selectedCategories,
    toggleCategory,
    isAdmin,
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    place,
    setPlace,
    organizer,
    setOrganizer,
    faculty,
    setFaculty,
    major,
    setMajor,
    availableMajors,
    degreeLevel,
    setDegreeLevel,
    hasAvailableSlots,
    setHasAvailableSlots,
    facets,
    onClear: clearFilters,
    hasActiveFilters,
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Recherche d&apos;événements</h1>
      <p className="text-gray-500 mb-6">
        Trouvez des événements par mots-clés, catégorie, date et plus.
      </p>

      {/* Barre de recherche avec autocomplétion */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Rechercher un événement…"
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 shadow-sm"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('')
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('q')
                  next.delete('page')
                  return next
                })
                inputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => handleSuggestionClick(s)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Onglets Événements / Organisateurs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'events'
              ? 'bg-white border border-b-white border-gray-200 -mb-px text-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Événements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('organizers')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'organizers'
              ? 'bg-white border border-b-white border-gray-200 -mb-px text-pink-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Organisateurs
        </button>
      </div>

      {/* Barre de contrôle mobile */}
      <div className="flex items-center justify-between mb-4 md:hidden">
        <button
          type="button"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 px-3 py-2 rounded-lg hover:border-pink-300 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-pink-500" />}
        </button>
        <div className="flex items-center gap-3">
          {totalElements > 0 && (
            <span className="text-sm text-gray-500">
              {totalElements} résultat{totalElements > 1 ? 's' : ''}
            </span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-pink-600 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Panneau de filtres mobile (événements uniquement) */}
      {showMobileFilters && activeTab === 'events' && (
        <div className="md:hidden mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <FilterSidebar {...filterProps} />
        </div>
      )}

      {/* Layout principal : sidebar + résultats */}
      <div className="flex gap-6 items-start">
        {/* Sidebar desktop — visible uniquement pour l'onglet événements */}
        {activeTab === 'events' && (
          <aside className="hidden md:block w-64 shrink-0 sticky top-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                  Filtres
                </h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-pink-600 hover:underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <FilterSidebar {...filterProps} />
            </div>
          </aside>
        )}

        {/* Zone de résultats */}
        <div className="flex-1 min-w-0">
          {/* Compteur + pills actives (événements) */}
          {activeTab === 'events' && (
            <div className="flex items-center justify-between mb-3 hidden md:flex">
              {totalElements > 0 ? (
                <span className="text-sm text-gray-500">
                  {totalElements} résultat{totalElements > 1 ? 's' : ''}
                </span>
              ) : (
                <span />
              )}
            </div>
          )}

          {/* Pills des filtres actifs (événements) */}
          {activeTab === 'events' &&
            (category ||
              dateFrom ||
              dateTo ||
              place ||
              organizer ||
              faculty ||
              degreeLevel ||
              hasAvailableSlots) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCategories.map((cat) => (
                  <Pill key={cat} label={cat} onRemove={() => toggleCategory(cat)} />
                ))}
                {place && (
                  <Pill
                    label={
                      <>
                        <MapPin className="w-3 h-3" />
                        {place}
                      </>
                    }
                    onRemove={() => setPlace('')}
                  />
                )}
                {organizer && (
                  <Pill
                    label={
                      <>
                        <Building2 className="w-3 h-3" />
                        {organizer}
                      </>
                    }
                    onRemove={() => setOrganizer('')}
                  />
                )}
                {dateFrom && (
                  <Pill label={`Après le ${dateFrom}`} onRemove={() => setDateFrom('')} />
                )}
                {dateTo && <Pill label={`Avant le ${dateTo}`} onRemove={() => setDateTo('')} />}
                {faculty && (
                  <Pill
                    label={
                      <>
                        <BookOpen className="w-3 h-3" />
                        {faculty}
                      </>
                    }
                    onRemove={() => {
                      setFaculty('')
                      setMajor('')
                    }}
                  />
                )}
                {major && <Pill label={major} onRemove={() => setMajor('')} />}
                {degreeLevel && (
                  <Pill
                    label={
                      <>
                        <GraduationCap className="w-3 h-3" />
                        {DEGREE_LABELS[degreeLevel]}
                      </>
                    }
                    onRemove={() => setDegreeLevel('')}
                  />
                )}
                {hasAvailableSlots && (
                  <Pill label="Places dispo" onRemove={() => setHasAvailableSlots(false)} />
                )}
              </div>
            )}

          {/* ── Onglet Organisateurs ──────────────────────────────────── */}
          {activeTab === 'organizers' && (
            <>
              {isLoadingOrganizers && (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-white p-4 shadow-sm animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}
              {organizersError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">
                  Impossible de rechercher les organisateurs. Veuillez réessayer.
                </div>
              )}
              {!isLoadingOrganizers && !organizersError && organizers.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium text-gray-700">Aucun organisateur trouvé</p>
                  <p className="text-sm">Essayez d&apos;autres mots-clés.</p>
                </div>
              )}
              {!isLoadingOrganizers && organizers.length > 0 && (
                <div className="space-y-3">
                  {organizers.map((org) => (
                    <Link
                      key={org.userId}
                      to={`/organizers/${org.userId}`}
                      className="group flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-pink-200 transition-all"
                    >
                      <div className="shrink-0 w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold text-gray-900 group-hover:text-pink-600 truncate">
                            {org.associationName}
                          </p>
                          {org.verified && (
                            <span className="shrink-0 rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-xs font-medium">
                              Vérifié
                            </span>
                          )}
                        </div>
                        {org.description && (
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                            {org.description}
                          </p>
                        )}
                      </div>
                      {org.upcomingEventCount != null && org.upcomingEventCount > 0 && (
                        <div className="shrink-0 flex flex-col items-end justify-center text-right">
                          <span className="text-sm font-semibold text-pink-600">
                            {org.upcomingEventCount}
                          </span>
                          <span className="text-xs text-gray-400">
                            événement{org.upcomingEventCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
              {organizersTotalPages > 1 && (
                <nav
                  aria-label="Pagination organisateurs"
                  className="flex justify-center items-center gap-1.5 mt-10"
                >
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Préc.
                  </button>
                  {getPageNumbers(page, organizersTotalPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-pink-600 text-white shadow-sm'
                            : 'border text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p + 1}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(organizersTotalPages - 1, page + 1))}
                    disabled={page >= organizersTotalPages - 1}
                    className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    aria-label="Page suivante"
                  >
                    Suiv.
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              )}
            </>
          )}

          {/* ── Onglet Événements ─────────────────────────────────────── */}
          {/* Chargement */}
          {activeTab === 'events' && isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-white p-5 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Erreur */}
          {activeTab === 'events' && error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4">
              Impossible d&apos;exécuter la recherche. Veuillez réessayer.
            </div>
          )}

          {/* Aucun résultat */}
          {activeTab === 'events' && !isLoading && !error && events.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-700">Aucun événement trouvé</p>
              <p className="text-sm">Essayez d&apos;autres mots-clés ou modifiez vos filtres.</p>
            </div>
          )}

          {/* Liste de résultats */}
          {activeTab === 'events' && !isLoading && events.length > 0 && (
            <div className="space-y-3">
              {events.map((event) => {
                const d = event.time ? new Date(event.time) : null
                return (
                  <Link
                    key={event.eventId}
                    to={`/events/${event.eventId}`}
                    className="group flex items-stretch gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-pink-200 transition-all"
                  >
                    {/* Date bloc */}
                    {d ? (
                      <div className="shrink-0 flex flex-col items-center justify-center w-14 rounded-lg bg-pink-50 text-pink-700 py-2">
                        <span className="text-xl font-bold leading-none">
                          {d.getDate().toString().padStart(2, '0')}
                        </span>
                        <span className="text-xs font-medium uppercase mt-0.5">
                          {d.toLocaleDateString('fr-CH', { month: 'short' })}
                        </span>
                      </div>
                    ) : (
                      <div className="shrink-0 w-14 rounded-lg bg-gray-100" />
                    )}

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-semibold text-gray-900 group-hover:text-pink-600 line-clamp-1">
                          {event.title}
                        </h2>
                        {event.category && (
                          <span className="shrink-0 rounded-full bg-pink-50 text-pink-600 px-2.5 py-0.5 text-xs font-medium">
                            {event.category}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
                        {event.place && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {event.place}
                          </span>
                        )}
                        {d && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                            {event.endTime && (
                              <>
                                {' – '}
                                {new Date(event.endTime).toLocaleTimeString('fr-CH', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </span>
                        )}
                        {event.organizerName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            {event.organizerName}
                          </span>
                        )}
                      </div>

                      {event.tags?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Capacité */}
                    <div className="shrink-0 flex flex-col items-end justify-center gap-1 text-right">
                      {event.capacity != null &&
                        (event.isFull ? (
                          <span className="rounded-full bg-red-50 text-red-600 px-2.5 py-1 text-xs font-semibold">
                            Complet
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Users className="w-3.5 h-3.5" />
                            {event.availableSlots != null
                              ? `${event.availableSlots} place${event.availableSlots !== 1 ? 's' : ''} restante${event.availableSlots !== 1 ? 's' : ''}`
                              : `${event.capacity} place${event.capacity !== 1 ? 's' : ''}`}
                          </span>
                        ))}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Pagination événements */}
          {activeTab === 'events' && totalPages > 1 && (
            <nav aria-label="Pagination" className="flex justify-center items-center gap-1.5 mt-10">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
                Préc.
              </button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400 select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'border text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p + 1}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                aria-label="Page suivante"
              >
                Suiv.
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Pill helper ───────────────────────────────────────────────────────────────

function Pill({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 bg-pink-50 text-pink-700 rounded-full px-3 py-1 text-xs font-medium">
      {label}
      <button type="button" onClick={onRemove} aria-label="Retirer ce filtre">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
