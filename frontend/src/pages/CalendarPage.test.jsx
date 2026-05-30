// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CalendarPage from './CalendarPage'

vi.mock('../lib/apiServices', () => ({
  fetchMyRegistrations: vi.fn(),
  fetchCalendarEvents: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'

// Freeze "today" to Thursday 15 May 2026.
// vi.useFakeTimers({ toFake: ['Date'] }) only replaces the Date object,
// leaving setTimeout/setInterval real so React Query and findBy* work normally.
const TODAY = new Date('2026-05-15T10:00:00')

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Find the calendar day cell (role="button") whose number span equals `n`.
function getDay(n) {
  return screen
    .getAllByRole('button')
    .find((btn) => btn.querySelector('span')?.textContent?.trim() === String(n))
}

const sampleEvent = {
  eventId: 'evt-1',
  title: 'Tech Talk',
  time: '2026-05-15T14:00:00Z',
  place: 'Amphi A',
  category: 'Conférence',
  endTime: null,
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchCalendarEvents.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Layout ──────────────────────────────────────────────────────────────────

  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Calendrier' })).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderPage()
    expect(
      screen.getByText('Vois les événements en calendrier ou en chronologie.'),
    ).toBeInTheDocument()
  })

  it('shows the current month and year in the navigation heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Mai 2026' })).toBeInTheDocument()
  })

  it('shows the day-of-week headers', () => {
    renderPage()
    for (const d of ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']) {
      expect(screen.getByText(d)).toBeInTheDocument()
    }
  })

  it('does not show "Aujourd\'hui" button when already on the current month', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: "Aujourd'hui" })).not.toBeInTheDocument()
  })

  // ── Month navigation ─────────────────────────────────────────────────────────

  it('advances to the next month on "Mois suivant" click', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('heading', { name: 'Juin 2026' })).toBeInTheDocument()
  })

  it('goes to the previous month on "Mois précédent" click', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mois précédent' }))
    expect(screen.getByRole('heading', { name: 'Avril 2026' })).toBeInTheDocument()
  })

  it('wraps from January to December of the previous year', () => {
    renderPage()
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Mois précédent' }))
    }
    expect(screen.getByRole('heading', { name: 'Janvier 2026' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mois précédent' }))
    expect(screen.getByRole('heading', { name: 'Décembre 2025' })).toBeInTheDocument()
  })

  it('wraps from December to January of the next year', () => {
    // Start from November so only 2 clicks are needed instead of 8
    vi.setSystemTime(new Date('2026-11-15T10:00:00'))
    renderPage()
    expect(screen.getByRole('heading', { name: 'Novembre 2026' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('heading', { name: 'Décembre 2026' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('heading', { name: 'Janvier 2027' })).toBeInTheDocument()
  })

  it('shows "Aujourd\'hui" button when navigated away from current month', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('button', { name: "Aujourd'hui" })).toBeInTheDocument()
  })

  it('clicking "Aujourd\'hui" returns to the current month and hides the button', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    fireEvent.click(screen.getByRole('button', { name: "Aujourd'hui" }))
    expect(screen.getByRole('heading', { name: 'Mai 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Aujourd'hui" })).not.toBeInTheDocument()
  })

  it('resets the selected day when navigating months', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    expect(screen.getByRole('heading', { name: /15 Mai 2026/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.queryByRole('heading', { name: /15 Mai 2026/ })).not.toBeInTheDocument()
  })

  // ── View toggle ──────────────────────────────────────────────────────────────

  it('defaults to "Tous les événements" view with active styling', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Tous les événements' })).toHaveClass('bg-white')
    expect(screen.getByRole('button', { name: 'Mes inscriptions' })).not.toHaveClass('bg-white')
  })

  it('activates "Mes inscriptions" when clicked', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    expect(screen.getByRole('button', { name: 'Mes inscriptions' })).toHaveClass('bg-white')
    expect(screen.getByRole('button', { name: 'Tous les événements' })).not.toHaveClass('bg-white')
  })

  it('resets the selected day when switching view', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    expect(screen.getByRole('heading', { name: /15 Mai 2026/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tous les événements' }))
    expect(screen.queryByRole('heading', { name: /15 Mai 2026/ })).not.toBeInTheDocument()
  })

  // ── Loading / Error / Empty states ───────────────────────────────────────────

  it('shows loading text while fetching calendar events', () => {
    apiServices.fetchCalendarEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('shows an error banner when fetchCalendarEvents rejects', async () => {
    apiServices.fetchCalendarEvents.mockRejectedValue(new Error('Network error'))
    renderPage()
    expect(
      await screen.findByText('Impossible de charger les événements. Veuillez réessayer.'),
    ).toBeInTheDocument()
  })

  it('shows the "mine" empty state when no registered events this month', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    expect(await screen.findByText('Aucun événement inscrit ce mois-ci.')).toBeInTheDocument()
  })

  it('shows the "all" empty state when no events this month', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Tous les événements' }))
    expect(await screen.findByText('Aucun événement publié ce mois-ci.')).toBeInTheDocument()
  })

  // ── Calendar grid — event pills ──────────────────────────────────────────────

  it('renders an event pill on the correct day cell', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    expect(await screen.findByText('Tech Talk')).toBeInTheDocument()
  })

  it('applies CONFIRMED (pink) pill style', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    const pill = await screen.findByText('Tech Talk')
    expect(pill).toHaveClass('bg-pink-100')
  })

  it('applies WAITLISTED (yellow) pill style', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'WAITLISTED' }],
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    const pill = await screen.findByText('Tech Talk')
    expect(pill).toHaveClass('bg-yellow-100')
  })

  it('applies the unregistered pill style for an unregistered event', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Tous les événements' }))
    const pill = await screen.findByText('Tech Talk')
    expect(pill).toHaveClass('bg-pink-50')
  })

  it('excludes CANCELLED registrations from "mine" view', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CANCELLED' }],
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    await screen.findByText('Aucun événement inscrit ce mois-ci.')
    expect(screen.queryByText('Tech Talk')).not.toBeInTheDocument()
  })

  it('shows all events in "all" view regardless of registration status', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Tous les événements' }))
    expect(await screen.findByText('Tech Talk')).toBeInTheDocument()
  })

  it('shows "+1 autre" when a day has more than 2 events', async () => {
    const events = [
      { ...sampleEvent, eventId: 'e1', title: 'Event Un' },
      { ...sampleEvent, eventId: 'e2', title: 'Event Deux' },
      { ...sampleEvent, eventId: 'e3', title: 'Event Trois' },
    ]
    apiServices.fetchCalendarEvents.mockResolvedValue(events)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: events.map((e) => ({ eventId: e.eventId, status: 'CONFIRMED' })),
    })
    renderPage()
    expect(await screen.findByText('+1 autre')).toBeInTheDocument()
  })

  it('shows "+2 autres" when a day has 4 events', async () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      ...sampleEvent,
      eventId: `e${i}`,
      title: `Event ${i}`,
    }))
    apiServices.fetchCalendarEvents.mockResolvedValue(events)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: events.map((e) => ({ eventId: e.eventId, status: 'CONFIRMED' })),
    })
    renderPage()
    expect(await screen.findByText('+2 autres')).toBeInTheDocument()
  })

  // ── Day detail panel ─────────────────────────────────────────────────────────

  it('clicking a day opens the detail panel with the date heading', async () => {
    renderPage()
    await screen.findByText('Aucun événement publié ce mois-ci.')
    fireEvent.click(getDay(3))
    expect(screen.getByRole('heading', { name: /3 Mai 2026/ })).toBeInTheDocument()
  })

  it('clicking the same day again closes the detail panel', async () => {
    renderPage()
    await screen.findByText('Aucun événement publié ce mois-ci.')
    const cell = getDay(3)
    fireEvent.click(cell)
    expect(screen.getByRole('heading', { name: /3 Mai 2026/ })).toBeInTheDocument()
    fireEvent.click(cell)
    expect(screen.queryByRole('heading', { name: /3 Mai 2026/ })).not.toBeInTheDocument()
  })

  it('shows "Aucun événement ce jour." for a day with no events', async () => {
    renderPage()
    await screen.findByText('Aucun événement publié ce mois-ci.')
    fireEvent.click(getDay(3))
    expect(screen.getByText('Aucun événement ce jour.')).toBeInTheDocument()
  })

  it('shows event title and CONFIRMED status chip in the panel', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(within(panel).getByRole('heading', { name: 'Tech Talk' })).toBeInTheDocument()
    expect(within(panel).getByText('Inscrit')).toBeInTheDocument()
  })

  it('shows WAITLISTED status chip in the panel', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'WAITLISTED' }],
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Mes inscriptions' }))
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(within(panel).getByText("Liste d'attente")).toBeInTheDocument()
  })

  it('shows "Publié" badge for an unregistered event in "all" view', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Tous les événements' }))
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(within(panel).getByText('Publié')).toBeInTheDocument()
  })

  it('shows the time icon in the panel for an event with a time', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(panel.querySelector('.lucide-clock')).toBeInTheDocument()
  })

  it('shows the endTime separator "–" when endTime is set', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([
      { ...sampleEvent, endTime: '2026-05-15T16:00:00Z' },
    ])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(within(panel).getByText(/–/)).toBeInTheDocument()
  })

  it('shows the place in the panel', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(within(panel).getByText(/Amphi A/)).toBeInTheDocument()
  })

  it('shows the category in the panel', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const panel = screen.getByRole('heading', { name: /15 Mai 2026/ }).parentElement
    expect(within(panel).getByText(/Conférence/)).toBeInTheDocument()
  })

  it('renders a link to the event detail page in the panel', async () => {
    apiServices.fetchCalendarEvents.mockResolvedValue([sampleEvent])
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-1', status: 'CONFIRMED' }],
    })
    renderPage()
    await screen.findByText('Tech Talk')
    fireEvent.click(getDay(15))
    const link = screen.getByRole('link', { name: /Tech Talk/ })
    expect(link).toHaveAttribute('href', '/events/evt-1')
  })
})
