// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SearchPage from './SearchPage'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/apiServices', () => ({
  searchEvents: vi.fn(),
  fetchEventSuggestions: vi.fn(),
  searchOrganizers: vi.fn(),
}))

vi.mock('../contexts/useApp', () => ({
  useApp: () => ({ userRole: 'STUDENT' }),
}))

vi.mock('../lib/universityData', () => ({
  FACULTY_OPTIONS: ['Sciences', 'Droit'],
  PROGRAM_OPTIONS_BY_FACULTY: { Sciences: ['Informatique', 'Biologie'] },
  DEGREE_LABELS: { BACHELOR: 'Bachelor', MASTER: 'Master', PHD: 'Doctorat' },
}))

import * as apiServices from '../lib/apiServices'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const emptyResult = { content: [], totalPages: 0, totalElements: 0, facets: { categories: [] } }

const sampleEvent = {
  eventId: 'evt-1',
  title: 'Conférence IA',
  category: 'Tech',
  place: 'Uni Mail',
  time: '2026-09-15T14:00:00Z',
  endTime: '2026-09-15T16:00:00Z',
  organizerName: 'Club Tech',
  capacity: 100,
  registeredCount: 30,
  availableSlots: 70,
  isFull: false,
  tags: ['ia', 'machine-learning'],
  organizerId: 'org-1',
}

const fullEvent = {
  ...sampleEvent,
  eventId: 'evt-full',
  title: 'Atelier Complet',
  capacity: 20,
  registeredCount: 20,
  availableSlots: 0,
  isFull: true,
}

const sampleOrganizer = {
  userId: 'org-uuid-1',
  associationName: 'Club Robotique',
  description: 'Passionnés de robots',
  upcomingEventCount: 3,
  verified: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(initialPath = '/search') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    apiServices.fetchEventSuggestions.mockResolvedValue({ suggestions: [] })
    apiServices.searchOrganizers.mockResolvedValue(emptyResult)
  })

  // ── Render ───────────────────────────────────────────────────────────────

  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Recherche d'événements/i })).toBeInTheDocument()
  })

  it('renders the search input', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/Rechercher un événement/i)).toBeInTheDocument()
  })

  it('renders event and organizer tabs', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /Événements/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Organisateurs/i })).toBeInTheDocument()
  })

  it('renders the filter sidebar sort dropdown', () => {
    renderPage()
    // The sort select shows "Date (croissante)" as the default option
    expect(screen.getByDisplayValue('Date (croissante)')).toBeInTheDocument()
  })

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows skeleton cards while loading', () => {
    apiServices.searchEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    // Skeleton cards use animate-pulse class
    const pulseEls = document.querySelectorAll('.animate-pulse')
    expect(pulseEls.length).toBeGreaterThan(0)
  })

  // ── Empty / error states ─────────────────────────────────────────────────

  it('shows empty message when no events match', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage()
    expect(await screen.findByText(/Aucun événement trouvé/i)).toBeInTheDocument()
  })

  it('shows error message when searchEvents rejects', async () => {
    apiServices.searchEvents.mockRejectedValue(new Error('network'))
    renderPage()
    expect(await screen.findByText(/Impossible d'exécuter la recherche/i)).toBeInTheDocument()
  })

  // ── Event cards ──────────────────────────────────────────────────────────

  it('renders event title, place, category, and organizer', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByText('Uni Mail')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()
    expect(screen.getByText('Club Tech')).toBeInTheDocument()
  })

  it('renders event tags', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByText('#ia')).toBeInTheDocument()
    expect(screen.getByText('#machine-learning')).toBeInTheDocument()
  })

  it('renders "N places restantes" for available events', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByText('70 places restantes')).toBeInTheDocument()
  })

  it('renders "Complet" badge for full events', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [fullEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Atelier Complet')
    expect(screen.getByText('Complet')).toBeInTheDocument()
  })

  it('renders singular "1 place restante" correctly', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [{ ...sampleEvent, availableSlots: 1 }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByText('1 place restante')).toBeInTheDocument()
  })

  it('links each event card to /events/:id', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    const link = await screen.findByRole('link', { name: /Conférence IA/i })
    expect(link).toHaveAttribute('href', '/events/evt-1')
  })

  // ── Organizer tab ─────────────────────────────────────────────────────────

  it('switches to organizer tab on click', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    expect(await screen.findByText(/Aucun organisateur trouvé/i)).toBeInTheDocument()
  })

  it('renders organizer card with name, description, event count and verified badge', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [sampleOrganizer],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    expect(await screen.findByText('Club Robotique')).toBeInTheDocument()
    expect(screen.getByText('Passionnés de robots')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Vérifié')).toBeInTheDocument()
  })

  it('links organizer card to /organizers/:id', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [sampleOrganizer],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    const link = await screen.findByRole('link', { name: /Club Robotique/i })
    expect(link).toHaveAttribute('href', '/organizers/org-uuid-1')
  })

  it('shows organizer count badge on tab when results exist', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [sampleOrganizer],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    // Badge shows totalElements
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
  })

  it('shows error in organizer tab on failure', async () => {
    apiServices.searchOrganizers.mockRejectedValue(new Error('fail'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    expect(
      await screen.findByText(/Impossible de rechercher les organisateurs/i),
    ).toBeInTheDocument()
  })

  // ── Autocomplete ─────────────────────────────────────────────────────────

  it('shows autocomplete dropdown when suggestions are returned', async () => {
    apiServices.fetchEventSuggestions.mockResolvedValue({
      suggestions: ['Conférence IA', 'Conférence ML'],
    })
    renderPage()
    const input = screen.getByPlaceholderText(/Rechercher un événement/i)
    fireEvent.change(input, { target: { value: 'Co' } })
    fireEvent.focus(input)
    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByText('Conférence ML')).toBeInTheDocument()
  })

  it('does not show suggestions dropdown when input is empty', () => {
    apiServices.fetchEventSuggestions.mockResolvedValue({ suggestions: ['foo'] })
    renderPage()
    const input = screen.getByPlaceholderText(/Rechercher un événement/i)
    fireEvent.focus(input)
    expect(screen.queryByText('foo')).not.toBeInTheDocument()
  })

  // ── Filters ───────────────────────────────────────────────────────────────

  it('calls searchEvents with faculty filter from URL params', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?faculty=Sciences')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ faculty: 'Sciences' }),
    )
  })

  it('calls searchEvents with place filter from URL params', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?place=Uni+Mail')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ place: 'Uni Mail' }),
    )
  })

  it('calls searchEvents with hasAvailableSlots=true when slots=1 in URL', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?slots=1')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ hasAvailableSlots: true }),
    )
  })

  it('calls searchEvents with organizerId filter from URL params', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?organizer=org-uuid-42')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ organizerId: 'org-uuid-42' }),
    )
  })

  it('calls searchEvents with date range from URL params', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?from=2026-06-01&to=2026-06-30')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: '2026-06-01', dateTo: '2026-06-30' }),
    )
  })

  it('toggles hasAvailableSlots switch', async () => {
    renderPage()
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  it('changes sort via the sort dropdown', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage()
    // Target the sort select specifically (displays "Date (croissante)" by default)
    fireEvent.change(screen.getByDisplayValue('Date (croissante)'), {
      target: { value: 'date_desc' },
    })
    await waitFor(() =>
      expect(apiServices.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'date_desc' }),
      ),
    )
  })

  // ── URL-driven state ─────────────────────────────────────────────────────

  it('populates search input from ?q= URL param', () => {
    renderPage('/search?q=robotique')
    expect(screen.getByPlaceholderText(/Rechercher un événement/i)).toHaveValue('robotique')
  })

  it('calls searchEvents with q from URL on mount', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?q=robotique')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'robotique' }),
    )
  })

  it('shows Réinitialiser button when filters are active', async () => {
    renderPage('/search?q=foo')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(screen.getAllByText(/Réinitialiser/i).length).toBeGreaterThan(0)
  })

  // ── Pagination ────────────────────────────────────────────────────────────

  it('shows pagination when totalPages > 1', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 3,
      totalElements: 60,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    // Pagination prev/next buttons
    const prevButtons = screen.getAllByLabelText(/Page précédente/i)
    expect(prevButtons.length).toBeGreaterThan(0)
    expect(prevButtons[0]).toBeDisabled()
  })

  it('hides pagination when totalPages <= 1', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.queryByLabelText(/Page précédente/i)).not.toBeInTheDocument()
  })

  // ── Result count display ──────────────────────────────────────────────────

  it('shows result count for events', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    // "1 résultat" may appear in both the desktop header and mobile bar
    expect(screen.getAllByText(/1 résultat/i).length).toBeGreaterThan(0)
  })

  // ── Filter sidebar visibility ─────────────────────────────────────────────

  it('renders the faculty select in the filter sidebar', () => {
    renderPage()
    const selects = screen.getAllByRole('combobox')
    // There are multiple selects: sort + faculty (+ optionally degree level radios)
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('hides filter sidebar when organizer tab is active', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    // The filter sidebar (desktop aside) should not be visible
    expect(screen.queryByText(/Places disponibles uniquement/i)).not.toBeInTheDocument()
  })
})
