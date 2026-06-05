import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock, MapPin, Tag } from 'lucide-react'
import { fetchMyRegistrations, fetchCalendarEvents, fetchEvents } from '../lib/apiServices'
import { SAMPLE_EVENTS } from '../lib/sampleEvents'
import { DEMO_MODE } from '../lib/demoMode'

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// Returns 0=Mon … 6=Sun (ISO weekday)
function isoWeekDay(date) {
  return (date.getDay() + 6) % 7
}

function pad(n) {
  return String(n).padStart(2, '0')
}

const STATUS_LABEL = {
  CONFIRMED: 'Inscrit',
  WAITLISTED: "Liste d'attente",
  CANCELLED: 'Annulé',
}

const STATUS_CHIP = {
  CONFIRMED: 'bg-green-100 text-green-800',
  WAITLISTED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const EVENT_PILL = {
  CONFIRMED: 'bg-pink-100 text-pink-800',
  WAITLISTED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through',
  null: 'bg-pink-50 text-pink-700',
}

const VIEW_OPTIONS = [
  { value: 'all', label: 'Tous les événements' },
  { value: 'mine', label: 'Mes inscriptions' },
]

const DISPLAY_OPTIONS = [
  { value: 'grid', label: 'Calendrier' },
  { value: 'timeline', label: 'Chronologie' },
]

const fmtDayLong = (t) =>
  new Date(t).toLocaleDateString('fr-CH', { weekday: 'long', day: '2-digit', month: 'long' })
const fmtTime = (t) =>
  new Date(t).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const [view, setView] = useState('all')
  const [displayMode, setDisplayMode] = useState('grid')

  const from = `${year}-${pad(month + 1)}-01`
  const lastDay = daysInMonth(year, month)
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`

  const { data: regData } = useQuery({
    queryKey: ['myRegistrations'],
    queryFn: () => fetchMyRegistrations({ size: 200 }),
    enabled: view === 'mine',
  })

  // eventId → registration status (+ seed de démo pour l'aperçu)
  const registrationMap = useMemo(() => {
    const map = new Map()
    for (const reg of regData?.content ?? []) {
      if (reg.status !== 'CANCELLED') {
        map.set(reg.eventId, reg.status)
      }
    }
    if (DEMO_MODE && map.size === 0) {
      map.set('demo-1', 'CONFIRMED')
      map.set('demo-2', 'CONFIRMED')
      map.set('demo-3', 'WAITLISTED')
    }
    return map
  }, [regData])

  // Calendar events for this month
  const {
    data: realCalendarEvents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['calendarEvents', year, month],
    queryFn: () => fetchCalendarEvents({ from, to }),
    enabled: displayMode === 'grid',
  })

  // Preview/demo : événements de démo tombant dans le mois affiché
  const calendarEvents = useMemo(() => {
    if (realCalendarEvents.length > 0 || !DEMO_MODE) return realCalendarEvents
    return SAMPLE_EVENTS.filter((e) => {
      const d = new Date(e.time)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }, [realCalendarEvents, year, month])

  // All upcoming events for the timeline
  const { data: timelineData } = useQuery({
    queryKey: ['publicEvents', 'timeline'],
    queryFn: () => fetchEvents({ status: 'PUBLISHED', page: 0, size: 50 }),
    enabled: displayMode === 'timeline',
  })
  const timelineEvents = useMemo(() => {
    const content = timelineData?.content ?? []
    const source = content.length === 0 && DEMO_MODE ? SAMPLE_EVENTS : content
    const list = view === 'mine' ? source.filter((e) => registrationMap.has(e.eventId)) : source
    return [...list].sort((a, b) => new Date(a.time) - new Date(b.time))
  }, [timelineData, view, registrationMap])

  const displayedEvents = useMemo(
    () =>
      view === 'mine'
        ? calendarEvents.filter((e) => registrationMap.has(e.eventId))
        : calendarEvents,
    [calendarEvents, registrationMap, view],
  )

  const eventsByDay = useMemo(() => {
    const map = new Map()
    for (const event of displayedEvents) {
      const d = new Date(event.time).getDate()
      if (!map.has(d)) map.set(d, [])
      map.get(d).push({ ...event, myStatus: registrationMap.get(event.eventId) ?? null })
    }
    return map
  }, [displayedEvents, registrationMap])

  function prevMonth() {
    setSelectedDay(null)
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    setSelectedDay(null)
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  function goToday() {
    setSelectedDay(null)
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const firstDayOffset = isoWeekDay(new Date(year, month, 1))
  const totalDays = daysInMonth(year, month)
  const cells = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : []
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-gray-900">Calendrier</h1>
        {displayMode === 'grid' && !isCurrentMonth && (
          <button
            type="button"
            onClick={goToday}
            className="text-sm font-medium text-pink-600 hover:underline"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Vois les événements en calendrier ou en chronologie.
      </p>

      {/* Toggles : affichage + filtre */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {DISPLAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setDisplayMode(opt.value)
                setSelectedDay(null)
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                displayMode === opt.value
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setView(opt.value)
                setSelectedDay(null)
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                view === opt.value
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {displayMode === 'timeline' ? (
        /* ── Chronologie ─────────────────────────────────────────────── */
        timelineEvents.length === 0 ? (
          <p className="text-sm text-gray-500">
            {view === 'mine' ? 'Aucune inscription à venir.' : 'Aucun événement à venir.'}
          </p>
        ) : (
          <ol className="relative ml-2 space-y-6 border-l-2 border-pink-100 pl-6">
            {timelineEvents.map((ev) => (
              <li key={ev.eventId} className="relative">
                <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-pink-600 ring-4 ring-white" />
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">
                  {fmtDayLong(ev.time)}
                </p>
                <Link
                  to={`/events/${ev.eventId}`}
                  className="mt-1 block rounded-xl border bg-white p-4 shadow-sm transition hover:border-pink-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">{ev.title}</h4>
                    {ev.category && (
                      <span className="shrink-0 rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-600">
                        {ev.category}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {ev.time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-pink-500" />
                        {fmtTime(ev.time)}
                      </span>
                    )}
                    {ev.place && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-pink-500" />
                        {ev.place}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )
      ) : (
        /* ── Calendrier (grille) ─────────────────────────────────────── */
        <>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Mois précédent"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS_FR[month]} {year}
            </h2>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Mois suivant"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {error && calendarEvents.length === 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Impossible de charger les événements. Veuillez réessayer.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {DAYS_FR.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) {
                  return (
                    <div key={`pad-${i}`} className="min-h-[90px] border-b border-r bg-gray-50/60" />
                  )
                }

                const isToday = isCurrentMonth && day === today.getDate()
                const isSelected = selectedDay === day
                const dayEvents = eventsByDay.get(day) ?? []
                const col = (firstDayOffset + day - 1) % 7

                return (
                  <div
                    key={day}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedDay(isSelected ? null : day)}
                    className={[
                      'min-h-[90px] cursor-pointer border-b border-r p-1.5 transition-colors',
                      col === 6 ? 'border-r-0' : '',
                      isSelected ? 'bg-pink-50 ring-1 ring-inset ring-pink-300' : 'hover:bg-gray-50',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span
                      className={[
                        'mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                        isToday ? 'bg-pink-600 text-white' : 'text-gray-700',
                      ].join(' ')}
                    >
                      {day}
                    </span>

                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.eventId}
                        className={`mb-0.5 truncate rounded px-1 py-0.5 text-xs font-medium ${EVENT_PILL[ev.myStatus] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{dayEvents.length - 2} autre{dayEvents.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {isLoading && calendarEvents.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-400">Chargement…</p>
          )}

          {!isLoading && !error && displayedEvents.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-500">
              {view === 'mine'
                ? 'Aucun événement inscrit ce mois-ci.'
                : 'Aucun événement publié ce mois-ci.'}
            </p>
          )}

          {selectedDay !== null && (
            <div className="mt-6">
              <h3 className="mb-3 text-base font-semibold text-gray-800">
                {selectedDay} {MONTHS_FR[month]} {year}
              </h3>

              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun événement ce jour.</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((ev) => (
                    <Link
                      key={ev.eventId}
                      to={`/events/${ev.eventId}`}
                      className="block rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:border-pink-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-semibold text-gray-900">{ev.title}</h4>
                        {ev.myStatus ? (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[ev.myStatus] ?? 'bg-gray-100 text-gray-700'}`}
                          >
                            {STATUS_LABEL[ev.myStatus]}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                            Publié
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        {ev.time && (
                          <p className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-pink-500" />
                            {fmtTime(ev.time)}
                            {ev.endTime && <> – {fmtTime(ev.endTime)}</>}
                          </p>
                        )}
                        {ev.place && (
                          <p className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-pink-500" /> {ev.place}
                          </p>
                        )}
                        {ev.category && (
                          <p className="flex items-center gap-1.5">
                            <Tag className="h-4 w-4 text-pink-500" /> {ev.category}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
