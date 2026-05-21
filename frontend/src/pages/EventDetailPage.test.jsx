import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import EventDetailPage from './EventDetailPage'

vi.mock('../lib/apiServices', () => ({
  fetchEventDetail: vi.fn(),
  fetchMyRegistrations: vi.fn(),
  registerForEvent: vi.fn(),
  cancelRegistration: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'

function renderPage(eventId = 'evt-42', contextValue = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{ userRole: 'STUDENT', userId: null, ...contextValue }}>
        <MemoryRouter initialEntries={[`/events/${eventId}`]}>
          <Routes>
            <Route path="/events/:id" element={<EventDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>
    </QueryClientProvider>,
  )
}

const sampleEvent = {
  eventId: 'evt-42',
  title: 'Grande Conférence Tech',
  status: 'PUBLISHED',
  category: 'Conférence',
  place: 'Amphi A',
  time: '2026-06-10T14:00:00Z',
  endTime: null,
  capacity: 100,
  registeredCount: 40,
  organizerId: 'user-org-1',
  organizerName: 'Prof. Dupont',
  description: 'Une description détaillée.',
  tags: ['tech', 'informatique'],
  restrictedTo: null,
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows no heading while loading', () => {
    apiServices.fetchEventDetail.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('shows error message when fetch fails', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('Événement non trouvé.'))
    renderPage()
    expect(await screen.findByText(/Événement introuvable ou inaccessible/i)).toBeInTheDocument()
  })

  it('shows Retour button on error state', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('404'))
    renderPage()
    await screen.findByText(/Événement introuvable ou inaccessible/i)
    expect(screen.getByRole('button', { name: /← Retour/i })).toBeInTheDocument()
  })

  it('renders event title', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    expect(await screen.findByText('Grande Conférence Tech')).toBeInTheDocument()
  })

  it('renders PUBLISHED status badge', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Publié')).toBeInTheDocument()
  })

  it('renders DRAFT status badge', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, status: 'DRAFT' })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Brouillon')).toBeInTheDocument()
  })

  it('renders CANCELLED status badge', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, status: 'CANCELLED' })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Annulé')).toBeInTheDocument()
  })

  it('renders category badge', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Conférence')).toBeInTheDocument()
  })

  it('renders place', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Amphi A')).toBeInTheDocument()
  })

  it('shows "—" when place is null', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, place: null })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows description section when present', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Une description détaillée.')).toBeInTheDocument()
  })

  it('hides description section when absent', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, description: null })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('renders tags', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('#tech')).toBeInTheDocument()
    expect(screen.getByText('#informatique')).toBeInTheDocument()
  })

  it('hides tags section when empty', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, tags: [] })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByText('Tags')).not.toBeInTheDocument()
  })

  it('shows restrictions when present', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      restrictedTo: { faculties: ['Sciences'], majors: [], degreeLevels: [] },
    })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText(/Accès restreint/i)).toBeInTheDocument()
    expect(screen.getByText(/Sciences/)).toBeInTheDocument()
  })

  it('shows restricted majors and degree levels when present', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      restrictedTo: {
        faculties: [],
        majors: ['Informatique', 'Mathématiques'],
        degreeLevels: ['MASTER', 'BACHELOR'],
      },
    })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText(/Accès restreint/i)).toBeInTheDocument()
    expect(screen.getByText(/Informatique/)).toBeInTheDocument()
    expect(screen.getByText(/MASTER/)).toBeInTheDocument()
  })

  it('hides restrictions block when null', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByText(/Accès restreint/i)).not.toBeInTheDocument()
  })

  it('renders organizer name as link', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    const link = screen.getByRole('link', { name: 'Prof. Dupont' })
    expect(link).toHaveAttribute('href', '/organizers/user-org-1')
  })

  it('shows "Modifier" link for event owner', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByRole('link', { name: /Modifier/i })).toBeInTheDocument()
  })

  it('shows "Modifier" link for ADMIN regardless of ownership', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'ADMIN', userId: 'other-user' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByRole('link', { name: /Modifier/i })).toBeInTheDocument()
  })

  it('hides "Modifier" link for non-owner STUDENT', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'other-user' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByRole('link', { name: /Modifier/i })).not.toBeInTheDocument()
  })

  it('hides "Modifier" link for non-owner ORGANIZER', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'other-org' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByRole('link', { name: /Modifier/i })).not.toBeInTheDocument()
  })

  it('shows "Complet" when no spots left', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      capacity: 10,
      registeredCount: 10,
    })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Complet')).toBeInTheDocument()
  })

  it('shows remaining spots when spotsLeft <= 10', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      capacity: 10,
      registeredCount: 5,
    })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText(/5 places? restantes?/i)).toBeInTheDocument()
  })

  it('does not show remaining spots banner when enough seats remain', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      capacity: 100,
      registeredCount: 40,
    })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    // 60 spots left — count is shown but without orange urgency styling
    const spotsSpan = screen.getAllByText(/restantes?/i).find((el) => el.tagName === 'SPAN')
    expect(spotsSpan).not.toHaveClass('text-orange-600')
  })

  it('shows "Illimitées" when capacity is null', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, capacity: null })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Illimitées')).toBeInTheDocument()
  })

  it('shows end time section when endTime is present', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      endTime: '2026-06-10T17:00:00Z',
    })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText('Fin')).toBeInTheDocument()
  })

  it('hides end time section when endTime is null', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByText('Fin')).not.toBeInTheDocument()
  })

  it('shows Retour button when event loaded', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByRole('button', { name: /← Retour/i })).toBeInTheDocument()
  })
})

// ── Registration flow ────────────────────────────────────────────────────────

describe('EventDetailPage — registration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
  })

  it('shows "S\'inscrire" button for a logged-in STUDENT on a PUBLISHED event', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByRole('button', { name: /S'inscrire/i })).toBeInTheDocument()
  })

  it('does not show the registration section for an unauthenticated visitor', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: null })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByRole('button', { name: /S'inscrire/i })).not.toBeInTheDocument()
  })

  it('does not show the registration section for the event owner', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByRole('button', { name: /S'inscrire/i })).not.toBeInTheDocument()
  })

  it('opens the registration confirmation dialog when clicking "S\'inscrire"', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    expect(screen.getByRole('heading', { name: /Confirmer l'inscription/i })).toBeInTheDocument()
  })

  it('closes the confirmation dialog without registering when clicking "Annuler"', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Annuler$/i }))
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Confirmer l'inscription/i }),
      ).not.toBeInTheDocument(),
    )
    expect(apiServices.registerForEvent).not.toHaveBeenCalled()
  })

  it('calls registerForEvent and closes dialog after confirming', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.registerForEvent.mockResolvedValue({ registrationId: 'reg-1', status: 'CONFIRMED' })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Confirmer l'inscription/i }),
      ).not.toBeInTheDocument(),
    )
    expect(apiServices.registerForEvent).toHaveBeenCalledTimes(1)
  })

  it('shows mutation error message when registerForEvent fails', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.registerForEvent.mockRejectedValue(
      new Error('Vous êtes déjà inscrit à cet événement.'),
    )
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))
    expect(await screen.findByText('Vous êtes déjà inscrit à cet événement.')).toBeInTheDocument()
  })

  it('shows "Vous êtes inscrit" when already registered (CONFIRMED)', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ registrationId: 'reg-1', eventId: 'evt-42', status: 'CONFIRMED' }],
    })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(await screen.findByText(/Vous êtes inscrit/i)).toBeInTheDocument()
  })

  it('shows "En liste d\'attente" when registered with WAITLISTED status', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [
        {
          registrationId: 'reg-1',
          eventId: 'evt-42',
          status: 'WAITLISTED',
          waitlistPosition: 3,
        },
      ],
    })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(await screen.findByText(/liste d'attente/i)).toBeInTheDocument()
  })

  it('shows cancel-registration button when already registered', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ registrationId: 'reg-1', eventId: 'evt-42', status: 'CONFIRMED' }],
    })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(
      await screen.findByRole('button', { name: /Annuler l'inscription/i }),
    ).toBeInTheDocument()
  })

  it('opens the cancel confirmation dialog', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ registrationId: 'reg-1', eventId: 'evt-42', status: 'CONFIRMED' }],
    })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByRole('button', { name: /Annuler l'inscription/i })
    fireEvent.click(screen.getByRole('button', { name: /Annuler l'inscription/i }))
    expect(screen.getByRole('heading', { name: /Confirmer l'annulation/i })).toBeInTheDocument()
  })

  it('calls cancelRegistration and closes dialog after confirming', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ registrationId: 'reg-1', eventId: 'evt-42', status: 'CONFIRMED' }],
    })
    apiServices.cancelRegistration.mockResolvedValue(undefined)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByRole('button', { name: /Annuler l'inscription/i })
    fireEvent.click(screen.getByRole('button', { name: /Annuler l'inscription/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Confirmer l'annulation/i }),
      ).not.toBeInTheDocument(),
    )
    expect(apiServices.cancelRegistration).toHaveBeenCalledWith('reg-1')
  })

  it('shows mutation error when cancelRegistration fails', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ registrationId: 'reg-1', eventId: 'evt-42', status: 'CONFIRMED' }],
    })
    apiServices.cancelRegistration.mockRejectedValue(
      new Error("Impossible d'annuler votre inscription."),
    )
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByRole('button', { name: /Annuler l'inscription/i })
    fireEvent.click(screen.getByRole('button', { name: /Annuler l'inscription/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Confirmer$/i }))
    expect(await screen.findByText(/Impossible d'annuler votre inscription/i)).toBeInTheDocument()
  })

  it('disables "S\'inscrire" and shows "Complet" when event is full', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({
      ...sampleEvent,
      capacity: 10,
      registeredCount: 10,
    })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    const btn = screen.getByRole('button', { name: /Complet/i })
    expect(btn).toBeDisabled()
  })
})
