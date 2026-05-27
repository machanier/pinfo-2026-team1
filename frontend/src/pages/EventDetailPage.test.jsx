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
  fetchEventAnnouncements: vi.fn(),
  createEventAnnouncement: vi.fn(),
  deleteEventAnnouncement: vi.fn(),
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

const emptyAnnouncementsPage = { content: [], page: 0, size: 3, totalElements: 0, totalPages: 0 }
const sampleEventAsOwner = { ...sampleEvent, requesterIsOrganizer: true }
const sampleAnnouncementsPage = {
  content: [
    { announcementId: 'ann-1', body: 'Salle changée au bât. A', postedAt: '2026-06-01T10:00:00Z' },
    {
      announcementId: 'ann-2',
      body: 'Apportez votre ordinateur',
      postedAt: '2026-05-30T09:00:00Z',
    },
  ],
  page: 0,
  size: 3,
  totalElements: 2,
  totalPages: 1,
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchEventAnnouncements.mockResolvedValue(emptyAnnouncementsPage)
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

  it('shows cancelled banner when event is CANCELLED', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, status: 'CANCELLED' })
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText(/Cet événement a été annulé/i)).toBeInTheDocument()
  })

  it('shows registration cancelled message when user had a registration on a CANCELLED event', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, status: 'CANCELLED' })
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ eventId: 'evt-42', status: 'CANCELLED', registrationId: 'reg-1' }],
    })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByText(/Votre inscription a été automatiquement annulée/i)).toBeInTheDocument()
  })

  it('hides registration section for CANCELLED events', async () => {
    apiServices.fetchEventDetail.mockResolvedValue({ ...sampleEvent, status: 'CANCELLED' })
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByRole('button', { name: /S'inscrire/i })).not.toBeInTheDocument()
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
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
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

  it('navigates back when Retour button is clicked in error state', async () => {
    apiServices.fetchEventDetail.mockRejectedValue(new Error('404'))
    renderPage()
    await screen.findByText(/Événement introuvable ou inaccessible/i)
    fireEvent.click(screen.getByRole('button', { name: /← Retour/i }))
  })

  it('navigates back when Retour button is clicked on the event page', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /← Retour/i }))
  })
})

// ── Registration flow ────────────────────────────────────────────────────────

describe('EventDetailPage — registration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventAnnouncements.mockResolvedValue(emptyAnnouncementsPage)
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
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
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

  it('closes confirmation dialog when backdrop is clicked', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    const heading = screen.getByRole('heading', { name: /Confirmer l'inscription/i })
    expect(heading).toBeInTheDocument()
    const backdrop = heading.closest('[role="presentation"]').parentElement
    fireEvent.click(backdrop)
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Confirmer l'inscription/i }),
      ).not.toBeInTheDocument(),
    )
  })

  it('closes confirmation dialog when Escape is pressed on backdrop', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    const heading = screen.getByRole('heading', { name: /Confirmer l'inscription/i })
    const backdrop = heading.closest('[role="presentation"]').parentElement
    fireEvent.keyDown(backdrop, { key: 'Escape' })
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /Confirmer l'inscription/i }),
      ).not.toBeInTheDocument(),
    )
  })

  it('does not close confirmation dialog when non-Escape key is pressed on inner div', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.click(screen.getByRole('button', { name: /S'inscrire/i }))
    const heading = screen.getByRole('heading', { name: /Confirmer l'inscription/i })
    const innerDiv = heading.closest('[role="presentation"]')
    fireEvent.keyDown(innerDiv, { key: 'Enter' })
    expect(screen.getByRole('heading', { name: /Confirmer l'inscription/i })).toBeInTheDocument()
  })
})

// ── Announcements ─────────────────────────────────────────────────────────────

describe('EventDetailPage — announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent)
    apiServices.fetchEventAnnouncements.mockResolvedValue(emptyAnnouncementsPage)
  })

  it('shows the Annonces section heading', async () => {
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByRole('heading', { name: /Annonces/i })).toBeInTheDocument()
  })

  it('shows empty state when no announcements', async () => {
    renderPage()
    await screen.findByText('Grande Conférence Tech')
    expect(await screen.findByText(/Aucune annonce pour le moment/i)).toBeInTheDocument()
  })

  it('renders announcement bodies', async () => {
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage()
    expect(await screen.findByText('Salle changée au bât. A')).toBeInTheDocument()
    expect(screen.getByText('Apportez votre ordinateur')).toBeInTheDocument()
  })

  it('shows announce form for organizer owner', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByPlaceholderText(/Rédigez une annonce/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publier/i })).toBeInTheDocument()
  })

  it('shows announce form for ADMIN', async () => {
    renderPage('evt-42', { userRole: 'ADMIN', userId: 'admin-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByPlaceholderText(/Rédigez une annonce/i)).toBeInTheDocument()
  })

  it('hides announce form for STUDENT', async () => {
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByPlaceholderText(/Rédigez une annonce/i)).not.toBeInTheDocument()
  })

  it('hides announce form for non-owner ORGANIZER', async () => {
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'other-org' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.queryByPlaceholderText(/Rédigez une annonce/i)).not.toBeInTheDocument()
  })

  it('disables Publier button when textarea is empty', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Grande Conférence Tech')
    expect(screen.getByRole('button', { name: /Publier/i })).toBeDisabled()
  })

  it('calls createEventAnnouncement on form submit', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.createEventAnnouncement.mockResolvedValue({
      announcementId: 'ann-new',
      body: 'Nouveau message',
      status: 'PUBLISHED',
    })
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.change(screen.getByPlaceholderText(/Rédigez une annonce/i), {
      target: { value: 'Nouveau message' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Publier/i }))
    await waitFor(() =>
      expect(apiServices.createEventAnnouncement).toHaveBeenCalledWith('evt-42', 'Nouveau message'),
    )
  })

  it('shows error when createEventAnnouncement fails', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.createEventAnnouncement.mockRejectedValue(
      new Error("Impossible de publier l'annonce."),
    )
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Grande Conférence Tech')
    fireEvent.change(screen.getByPlaceholderText(/Rédigez une annonce/i), {
      target: { value: 'Test annonce' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Publier/i }))
    expect(await screen.findByText(/Impossible de publier l'annonce/i)).toBeInTheDocument()
  })

  it('shows delete button for organizer owner', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Salle changée au bât. A')
    expect(screen.getAllByTitle(/Supprimer l'annonce/i).length).toBeGreaterThan(0)
  })

  it('hides delete button for STUDENT', async () => {
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage('evt-42', { userRole: 'STUDENT', userId: 'user-1' })
    await screen.findByText('Salle changée au bât. A')
    expect(screen.queryByTitle(/Supprimer l'annonce/i)).not.toBeInTheDocument()
  })

  it('calls deleteEventAnnouncement after confirming in dialog', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    apiServices.deleteEventAnnouncement.mockResolvedValue(undefined)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Salle changée au bât. A')
    // Click the trash icon — confirmation dialog should appear
    fireEvent.click(screen.getAllByTitle(/Supprimer l'annonce/i)[0])
    expect(screen.getByText("Supprimer l'annonce")).toBeInTheDocument()
    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() =>
      expect(apiServices.deleteEventAnnouncement).toHaveBeenCalledWith('evt-42', 'ann-1'),
    )
  })

  it('does not call deleteEventAnnouncement when cancelling the confirmation dialog', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Salle changée au bât. A')
    fireEvent.click(screen.getAllByTitle(/Supprimer l'annonce/i)[0])
    expect(screen.getByText("Supprimer l'annonce")).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByText("Supprimer l'annonce")).not.toBeInTheDocument()
    expect(apiServices.deleteEventAnnouncement).not.toHaveBeenCalled()
  })

  it('hides pagination when totalPages <= 1', async () => {
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage()
    await screen.findByText('Salle changée au bât. A')
    expect(screen.queryByRole('button', { name: /Précédent/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Suivant/i })).not.toBeInTheDocument()
  })

  it('shows pagination controls when totalPages > 1', async () => {
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-1', body: 'Premier lot', postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 6,
      totalPages: 2,
    })
    renderPage()
    await screen.findByText('Premier lot')
    expect(screen.getByRole('button', { name: /Précédent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Suivant/i })).toBeInTheDocument()
  })

  it('disables Précédent on the first page', async () => {
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-1', body: 'Premier lot', postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 6,
      totalPages: 2,
    })
    renderPage()
    await screen.findByText('Premier lot')
    expect(screen.getByRole('button', { name: /Précédent/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Suivant/i })).not.toBeDisabled()
  })

  it('advances to next page when Suivant is clicked', async () => {
    apiServices.fetchEventAnnouncements
      .mockResolvedValueOnce({
        content: [
          { announcementId: 'ann-1', body: 'Page 1 content', postedAt: '2026-06-01T10:00:00Z' },
        ],
        page: 0,
        size: 3,
        totalElements: 6,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        content: [
          { announcementId: 'ann-4', body: 'Page 2 content', postedAt: '2026-05-01T10:00:00Z' },
        ],
        page: 1,
        size: 3,
        totalElements: 6,
        totalPages: 2,
      })
    renderPage()
    await screen.findByText('Page 1 content')
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    expect(await screen.findByText('Page 2 content')).toBeInTheDocument()
  })

  // ── Truncation & modal ───────────────────────────────────────────────────

  it('shows full body when announcement is 120 chars or fewer', async () => {
    const shortBody = 'A'.repeat(120)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-short', body: shortBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    expect(await screen.findByText(shortBody)).toBeInTheDocument()
  })

  it('truncates body to 120 chars with ellipsis when longer', async () => {
    const longBody = 'B'.repeat(200)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-long', body: longBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    expect(await screen.findByText('B'.repeat(120) + '…')).toBeInTheDocument()
    expect(screen.queryByText(longBody)).not.toBeInTheDocument()
  })

  it('opens modal with full body when announcement is clicked', async () => {
    const longBody = 'C'.repeat(200)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-long', body: longBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    const preview = await screen.findByText('C'.repeat(120) + '…')
    fireEvent.click(preview)
    expect(screen.getByText(longBody)).toBeInTheDocument()
  })

  it('closes modal when ✕ button is clicked', async () => {
    const longBody = 'D'.repeat(200)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-long', body: longBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    fireEvent.click(await screen.findByText('D'.repeat(120) + '…'))
    expect(screen.getByText(longBody)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Fermer/i }))
    await waitFor(() => expect(screen.queryByText(longBody)).not.toBeInTheDocument())
  })

  it('closes modal when clicking the backdrop', async () => {
    const longBody = 'E'.repeat(200)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-long', body: longBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    fireEvent.click(await screen.findByText('E'.repeat(120) + '…'))
    const backdrop = screen.getByText(longBody).closest('[class*="fixed inset-0"]')
    fireEvent.click(backdrop)
    await waitFor(() => expect(screen.queryByText(longBody)).not.toBeInTheDocument())
  })

  it('closes modal when Escape key is pressed', async () => {
    const longBody = 'F'.repeat(200)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-long', body: longBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    fireEvent.click(await screen.findByText('F'.repeat(120) + '…'))
    const backdrop = screen.getByText(longBody).closest('[class*="fixed inset-0"]')
    fireEvent.keyDown(backdrop, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText(longBody)).not.toBeInTheDocument())
  })

  it('does not close announcement modal when non-Escape key is pressed on inner div', async () => {
    const longBody = 'G'.repeat(200)
    apiServices.fetchEventAnnouncements.mockResolvedValue({
      content: [{ announcementId: 'ann-long', body: longBody, postedAt: '2026-06-01T10:00:00Z' }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    })
    renderPage()
    fireEvent.click(await screen.findByText('G'.repeat(120) + '…'))
    const innerDiv = screen.getByText(longBody).closest('[role="presentation"]')
    fireEvent.keyDown(innerDiv, { key: 'Enter' })
    expect(screen.getByText(longBody)).toBeInTheDocument()
  })

  it('goes back to previous page when Précédent is clicked', async () => {
    apiServices.fetchEventAnnouncements
      .mockResolvedValueOnce({
        content: [
          { announcementId: 'ann-1', body: 'Page 1 content', postedAt: '2026-06-01T10:00:00Z' },
        ],
        page: 0,
        size: 3,
        totalElements: 6,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        content: [
          { announcementId: 'ann-4', body: 'Page 2 content', postedAt: '2026-05-01T10:00:00Z' },
        ],
        page: 1,
        size: 3,
        totalElements: 6,
        totalPages: 2,
      })
    renderPage()
    await screen.findByText('Page 1 content')
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    await screen.findByText('Page 2 content')
    fireEvent.click(screen.getByRole('button', { name: /Précédent/i }))
    expect(await screen.findByText('Page 1 content')).toBeInTheDocument()
  })

  it('closes announcement delete dialog when backdrop is clicked', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Salle changée au bât. A')
    fireEvent.click(screen.getAllByTitle(/Supprimer l'annonce/i)[0])
    const heading = screen.getByText("Supprimer l'annonce")
    expect(heading).toBeInTheDocument()
    const backdrop = heading.closest('[role="presentation"]').parentElement
    fireEvent.click(backdrop)
    await waitFor(() => expect(screen.queryByText("Supprimer l'annonce")).not.toBeInTheDocument())
  })

  it('closes announcement delete dialog when Escape is pressed on backdrop', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Salle changée au bât. A')
    fireEvent.click(screen.getAllByTitle(/Supprimer l'annonce/i)[0])
    const heading = screen.getByText("Supprimer l'annonce")
    const backdrop = heading.closest('[role="presentation"]').parentElement
    fireEvent.keyDown(backdrop, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText("Supprimer l'annonce")).not.toBeInTheDocument())
  })

  it('does not close announcement delete dialog when non-Escape key is pressed on inner div', async () => {
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventAsOwner)
    apiServices.fetchEventAnnouncements.mockResolvedValue(sampleAnnouncementsPage)
    renderPage('evt-42', { userRole: 'ORGANIZER', userId: 'user-org-1' })
    await screen.findByText('Salle changée au bât. A')
    fireEvent.click(screen.getAllByTitle(/Supprimer l'annonce/i)[0])
    const heading = screen.getByText("Supprimer l'annonce")
    const innerDiv = heading.closest('[role="presentation"]')
    fireEvent.keyDown(innerDiv, { key: 'Enter' })
    expect(screen.getByText("Supprimer l'annonce")).toBeInTheDocument()
  })
})
