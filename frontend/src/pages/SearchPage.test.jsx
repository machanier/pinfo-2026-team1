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

let mockUserRole = 'STUDENT'
vi.mock('../contexts/useApp', () => ({
  useApp: () => ({ userRole: mockUserRole }),
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
    mockUserRole = 'STUDENT'
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

  // ── Clear (X) button on search input ─────────────────────────────────────

  it('shows X button when input has value and clears it on click', async () => {
    renderPage()
    const input = screen.getByPlaceholderText(/Rechercher un événement/i)
    fireEvent.change(input, { target: { value: 'test' } })
    const clearBtn = screen.getByRole('button', { name: /Effacer la recherche/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(input).toHaveValue('')
    expect(screen.queryByRole('button', { name: /Effacer la recherche/i })).not.toBeInTheDocument()
  })

  it('does not show X button when input is empty', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /Effacer la recherche/i })).not.toBeInTheDocument()
  })

  // ── Suggestion click ──────────────────────────────────────────────────────

  it('clicking a suggestion fills the input with the suggestion text', async () => {
    apiServices.fetchEventSuggestions.mockResolvedValue({
      suggestions: ['Intelligence Artificielle'],
    })
    renderPage()
    const input = screen.getByPlaceholderText(/Rechercher un événement/i)
    fireEvent.change(input, { target: { value: 'Inte' } })
    fireEvent.focus(input)
    const suggestion = await screen.findByText('Intelligence Artificielle')
    fireEvent.mouseDown(suggestion)
    expect(input).toHaveValue('Intelligence Artificielle')
  })

  // ── Keyboard switch interaction ───────────────────────────────────────────

  it('toggles hasAvailableSlots switch via Space key', async () => {
    renderPage()
    const toggle = screen.getByRole('switch')
    fireEvent.keyDown(toggle, { key: ' ' })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  it('toggles hasAvailableSlots switch via Enter key', async () => {
    renderPage()
    const toggle = screen.getByRole('switch')
    fireEvent.keyDown(toggle, { key: 'Enter' })
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  // ── Active filter pills ───────────────────────────────────────────────────

  it('shows place pill and removes it on click', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?place=Uni+Mail')
    await screen.findByText(/Aucun événement trouvé/i)
    const pills = screen.getAllByLabelText(/Retirer ce filtre/i)
    expect(pills.length).toBeGreaterThan(0)
    fireEvent.click(pills[0])
    await waitFor(() =>
      expect(apiServices.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ place: undefined }),
      ),
    )
  })

  it('shows dateFrom pill when from param is set', async () => {
    renderPage('/search?from=2026-06-01')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(screen.getByText(/Après le 2026-06-01/i)).toBeInTheDocument()
  })

  it('shows dateTo pill when to param is set', async () => {
    renderPage('/search?to=2026-06-30')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(screen.getByText(/Avant le 2026-06-30/i)).toBeInTheDocument()
  })

  it('shows degreeLevel pill and removes it', async () => {
    renderPage('/search?degree=MASTER')
    await screen.findByText(/Aucun événement trouvé/i)
    // "Master" appears in both the radio label and the active pill
    expect(screen.getAllByText('Master').length).toBeGreaterThan(0)
    const pills = screen.getAllByLabelText(/Retirer ce filtre/i)
    fireEvent.click(pills[0])
    // After removal, no active pill — only the radio label remains (1 occurrence)
    await waitFor(() =>
      expect(screen.queryByLabelText(/Retirer ce filtre/i)).not.toBeInTheDocument(),
    )
  })

  it('shows hasAvailableSlots pill and removes it', async () => {
    renderPage('/search?slots=1')
    await screen.findByText(/Aucun événement trouvé/i)
    // Exact string "Places dispo" is the pill; "Places disponibles uniquement" is the toggle label
    expect(screen.getByText('Places dispo')).toBeInTheDocument()
    const pills = screen.getAllByLabelText(/Retirer ce filtre/i)
    fireEvent.click(pills[0])
    await waitFor(() => expect(screen.queryByText('Places dispo')).not.toBeInTheDocument())
  })

  it('shows organizer pill when organizer param is set', async () => {
    renderPage('/search?organizer=org-1')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(screen.getByText('org-1')).toBeInTheDocument()
  })

  // ── Faculty cascade ───────────────────────────────────────────────────────

  it('shows available majors dropdown when a faculty is selected', async () => {
    renderPage('/search?faculty=Sciences')
    await screen.findByText(/Aucun événement trouvé/i)
    // PROGRAM_OPTIONS_BY_FACULTY.Sciences = ['Informatique', 'Biologie']
    expect(screen.getByRole('option', { name: 'Informatique' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Biologie' })).toBeInTheDocument()
  })

  it('shows faculty pill when faculty param is set', async () => {
    renderPage('/search?faculty=Sciences')
    await screen.findByText(/Aucun événement trouvé/i)
    // "Sciences" appears in both the faculty select option and the active pill
    expect(screen.getAllByText('Sciences').length).toBeGreaterThan(0)
  })

  // ── Admin status filter ───────────────────────────────────────────────────

  it('shows status filter section when userRole is ADMIN', () => {
    mockUserRole = 'ADMIN'
    renderPage()
    expect(screen.getByText(/Statut \(Admin\)/i)).toBeInTheDocument()
  })

  // ── Event card edge cases ─────────────────────────────────────────────────

  it('renders grey placeholder when event has no time', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [{ ...sampleEvent, time: null }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    // No time text rendered for start time
    expect(screen.queryByText(/14:00/)).not.toBeInTheDocument()
  })

  it('renders end-time range when endTime is set', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent], // endTime: '2026-09-15T16:00:00Z'
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    // End time should appear; locale renders 16:00
    expect(screen.getByText(/16:00/)).toBeInTheDocument()
  })

  it('renders capacity when availableSlots is null', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [{ ...sampleEvent, availableSlots: null }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByText(/100 places/i)).toBeInTheDocument()
  })

  it('renders no capacity section when capacity is null', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [{ ...sampleEvent, capacity: null }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.queryByText(/places restantes/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Complet')).not.toBeInTheDocument()
  })

  // ── Pagination — events ───────────────────────────────────────────────────

  it('clicking next page button advances page', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 3,
      totalElements: 60,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    const nextBtn = screen.getAllByLabelText(/Page suivante/i)[0]
    fireEvent.click(nextBtn)
    await waitFor(() =>
      expect(apiServices.searchEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })),
    )
  })

  it('clicking prev page button is disabled on first page', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 3,
      totalElements: 60,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    const prevBtn = screen.getAllByLabelText(/Page précédente/i)[0]
    expect(prevBtn).toBeDisabled()
  })

  // ── Pagination — ellipsis ─────────────────────────────────────────────────

  it('shows ellipsis in pagination for many pages', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 10,
      totalElements: 200,
    })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getAllByText('…').length).toBeGreaterThan(0)
  })

  // ── Organizer pagination ──────────────────────────────────────────────────

  it('shows organizer pagination when totalPages > 1', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [sampleOrganizer],
      totalPages: 3,
      totalElements: 60,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    await screen.findByText('Club Robotique')
    expect(screen.getByLabelText(/Pagination organisateurs/i)).toBeInTheDocument()
  })

  // ── Organizer card edge cases ─────────────────────────────────────────────

  it('renders organizer card without description gracefully', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [{ ...sampleOrganizer, description: null }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    expect(await screen.findByText('Club Robotique')).toBeInTheDocument()
    expect(screen.queryByText('Passionnés de robots')).not.toBeInTheDocument()
  })

  it('hides event count when upcomingEventCount is 0', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [{ ...sampleOrganizer, upcomingEventCount: 0 }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    await screen.findByText('Club Robotique')
    // The count block should not be rendered when count is 0
    expect(screen.queryByText('événements')).not.toBeInTheDocument()
  })

  it('hides verified badge when org is not verified', async () => {
    apiServices.searchOrganizers.mockResolvedValue({
      content: [{ ...sampleOrganizer, verified: false }],
      totalPages: 1,
      totalElements: 1,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Organisateurs/i }))
    await screen.findByText('Club Robotique')
    expect(screen.queryByText('Vérifié')).not.toBeInTheDocument()
  })

  // ── Sidebar: category toggles from facets ─────────────────────────────────

  it('renders category checkboxes from facets and toggles one', async () => {
    apiServices.searchEvents.mockResolvedValue({
      ...emptyResult,
      content: [sampleEvent],
      totalPages: 1,
      totalElements: 1,
      facets: { categories: [{ value: 'Tech', count: 5 }] },
    })
    renderPage()
    await screen.findByText('Conférence IA')
    const checkbox = screen.getByRole('checkbox', { name: /Tech/i })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    await waitFor(() =>
      expect(apiServices.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Tech' }),
      ),
    )
  })

  // ── Mobile filter toggle ──────────────────────────────────────────────────

  it('Réinitialiser button in mobile bar clears all filters', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?q=test')
    await screen.findByText(/Aucun événement trouvé/i)
    // getAllByText since both mobile and desktop may render it
    const resetBtns = screen.getAllByText(/Réinitialiser/i)
    fireEvent.click(resetBtns[0])
    await waitFor(() =>
      expect(apiServices.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ q: undefined }),
      ),
    )
  })

  // ── Degree level radio ────────────────────────────────────────────────────

  it('calls searchEvents with degreeLevel from URL', async () => {
    apiServices.searchEvents.mockResolvedValue(emptyResult)
    renderPage('/search?degree=BACHELOR')
    await screen.findByText(/Aucun événement trouvé/i)
    expect(apiServices.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ degreeLevel: 'BACHELOR' }),
    )
  })
})
