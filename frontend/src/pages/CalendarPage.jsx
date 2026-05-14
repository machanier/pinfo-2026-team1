import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchMyRegistrations, fetchCalendarEvents } from '../lib/apiServices'

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
  null: 'bg-blue-100 text-blue-800',
}

// 'all' = tous les événements publiés | 'mine' = seulement mes inscriptions
const VIEW_OPTIONS = [
  { value: 'all', label: 'Tous les événements' },
  { value: 'mine', label: 'Mes inscriptions' },
]

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const [view, setView] = useState('mine')

  const from = `${year}-${pad(month + 1)}-01`
  const lastDay = daysInMonth(year, month)
  const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`

  // All my registrations (confirmed + waitlisted)
  const { data: regData } = useQuery({
    queryKey: ['myRegistrations'],
    queryFn: () => fetchMyRegistrations({ size: 200 }),
  })

  // eventId → registration status
  const registrationMap = useMemo(() => {
    const map = new Map()
    for (const reg of regData?.content ?? []) {
      if (reg.status !== 'CANCELLED') {
        map.set(reg.eventId, reg.status)
      }
    }
    return map
  }, [regData])

  // Calendar events for this month
  const {
    data: calendarEvents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['calendarEvents', year, month],
    queryFn: () => fetchCalendarEvents({ from, to }),
  })

  // Keep only events the user is registered for, or all events depending on view
  const displayedEvents = useMemo(
    () =>
      view === 'mine'
        ? calendarEvents.filter((e) => registrationMap.has(e.eventId))
        : calendarEvents,
    [calendarEvents, registrationMap, view],
  )

  // Group by day-of-month
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={goToday}
            className="text-sm text-pink-600 hover:underline font-medium"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-4">Explorez les événements mois par mois.</p>

      {/* View toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-6">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setView(opt.value)
              setSelectedDay(null)
            }}
            className={[
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === opt.value
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mois précédent"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {MONTHS_FR[month]} {year}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mois suivant"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-4 mb-4 text-sm">
          Impossible de charger les événements. Veuillez réessayer.
        </div>
      )}

      {/* Calendar grid */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAYS_FR.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) {
              return (
                <div key={`pad-${i}`} className="min-h-[90px] bg-gray-50/60 border-b border-r" />
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
                  'min-h-[90px] border-b border-r p-1.5 cursor-pointer transition-colors',
                  col === 6 ? 'border-r-0' : '',
                  isSelected ? 'bg-pink-50 ring-1 ring-inset ring-pink-300' : 'hover:bg-gray-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span
                  className={[
                    'inline-flex items-center justify-center w-7 h-7 text-sm rounded-full mb-1 font-medium',
                    isToday ? 'bg-pink-600 text-white' : 'text-gray-700',
                  ].join(' ')}
                >
                  {day}
                </span>

                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.eventId}
                    className={`text-xs truncate rounded px-1 py-0.5 mb-0.5 font-medium ${EVENT_PILL[ev.myStatus] ?? 'bg-gray-100 text-gray-600'}`}
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

      {/* Loading overlay */}
      {isLoading && <p className="text-center text-sm text-gray-400 mt-4">Chargement…</p>}

      {/* No events this month */}
      {!isLoading && !error && displayedEvents.length === 0 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          {view === 'mine'
            ? 'Aucun événement inscrit ce mois-ci.'
            : 'Aucun événement publié ce mois-ci.'}
        </p>
      )}

      {/* Selected day details */}
      {selectedDay !== null && (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-gray-800 mb-3">
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
                  className="block rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:border-pink-200 transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-gray-900 text-sm">{ev.title}</h4>
                    {ev.myStatus ? (
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[ev.myStatus] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {STATUS_LABEL[ev.myStatus]}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                        Publié
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    {ev.time && (
                      <p>
                        🕐{' '}
                        {new Date(ev.time).toLocaleTimeString('fr-CH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {ev.endTime && (
                          <>
                            {' '}
                            –{' '}
                            {new Date(ev.endTime).toLocaleTimeString('fr-CH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </>
                        )}
                      </p>
                    )}
                    {ev.place && <p>📍 {ev.place}</p>}
                    {ev.category && <p>🏷 {ev.category}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
