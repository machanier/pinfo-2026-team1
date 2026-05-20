import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import MyEventsPage from './MyEventsPage'

vi.mock('../lib/apiServices', () => ({
  fetchEvents: vi.fn(),
  deleteEvent: vi.fn(),
  publishEvent: vi.fn(),
  cancelEvent: vi.fn(),
  fetchMyRegistrations: vi.fn(),
  cancelRegistration: vi.fn(),
  fetchEventDetail: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'

function renderPage(contextValue) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>
        <BrowserRouter>
          <MyEventsPage />
        </BrowserRouter>
      </AppContext.Provider>
    </QueryClientProvider>,
  )
}

const organizerCtx = { userRole: 'ORGANIZER', isAuthenticated: true, isLoading: false }
const adminCtx = { userRole: 'ADMIN', isAuthenticated: true, isLoading: false }
const studentCtx = { userRole: 'STUDENT', isAuthenticated: true, isLoading: false }

const sampleEvent = {
  eventId: 'evt-1',
  title: 'Tech Talk',
  category: 'Conférence',
  place: 'Amphi A',
  time: '2026-05-10T14:00:00Z',
  status: 'PUBLISHED',
}

describe('MyEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Prevent "Query data cannot be undefined" for the student registrations query
    // that is enabled whenever userRole === 'STUDENT'.
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventDetail.mockResolvedValue(null)
  })

  it('shows empty state when not authenticated (not loading)', () => {
    renderPage({ userRole: 'ORGANIZER', isAuthenticated: false, isLoading: false })
    expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    expect(screen.getByText("Aucun événement pour l'instant.")).toBeInTheDocument()
  })

  it('shows loading state while fetch is pending', () => {
    apiServices.fetchEvents.mockReturnValue(new Promise(() => {}))
    renderPage(organizerCtx)
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('shows empty state message when no events returned', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(organizerCtx)
    expect(await screen.findByText("Aucun événement pour l'instant.")).toBeInTheDocument()
  })

  it('shows error message when fetchEvents fails', async () => {
    apiServices.fetchEvents.mockRejectedValue(new Error('Network error'))
    renderPage(organizerCtx)
    expect(await screen.findByText('Network error')).toBeInTheDocument()
  })

  it('renders events in a table', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Tech Talk')).toBeInTheDocument()
    expect(screen.getByText('Conférence')).toBeInTheDocument()
    expect(screen.getByText('Amphi A')).toBeInTheDocument()
  })

  it('shows PUBLISHED status badge as "Publié"', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Publié')).toBeInTheDocument()
  })

  it('shows DRAFT status badge as "Brouillon"', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, eventId: 'evt-2', status: 'DRAFT' }],
    })
    renderPage(organizerCtx)
    expect(await screen.findByText('Brouillon')).toBeInTheDocument()
  })

  it('shows CANCELLED status badge as "Annulé"', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, eventId: 'evt-3', status: 'CANCELLED' }],
    })
    renderPage(organizerCtx)
    expect(await screen.findByText('Annulé')).toBeInTheDocument()
  })

  it('shows unknown status as raw value', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, eventId: 'evt-4', status: 'PENDING' }],
    })
    renderPage(organizerCtx)
    expect(await screen.findByText('PENDING')).toBeInTheDocument()
  })

  it('shows "—" for null time', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, eventId: 'evt-5', time: null }],
    })
    renderPage(organizerCtx)
    await screen.findByText('Tech Talk')
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows "—" for null category', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, eventId: 'evt-6', category: null }],
    })
    renderPage(organizerCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows "Nouvel événement" button for ORGANIZER', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(organizerCtx)
    await screen.findByText("Aucun événement pour l'instant.")
    expect(screen.getByText('+ Nouvel événement')).toBeInTheDocument()
  })

  it('shows "Nouvel événement" button for ADMIN', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(adminCtx)
    await screen.findByText("Aucun événement pour l'instant.")
    expect(screen.getByText('+ Nouvel événement')).toBeInTheDocument()
  })

  it('hides "Nouvel événement" button for STUDENT', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(studentCtx)
    await screen.findByRole('heading', { name: /Mes inscriptions/i })
    expect(screen.queryByText('+ Nouvel événement')).not.toBeInTheDocument()
  })

  it('shows "Modifier" link for ORGANIZER', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Modifier')).toBeInTheDocument()
  })

  it('shows "Modifier" link for ADMIN', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(adminCtx)
    expect(await screen.findByText('Modifier')).toBeInTheDocument()
  })

  it('hides "Modifier" link for STUDENT', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(studentCtx)
    await screen.findByRole('heading', { name: /Mes inscriptions/i })
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument()
  })

  it('shows "Voir" link for each event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [
        { ...sampleEvent, eventId: 'evt-7' },
        { ...sampleEvent, eventId: 'evt-8', title: 'Event B' },
      ],
    })
    renderPage(organizerCtx)
    const voirLinks = await screen.findAllByText('Voir')
    expect(voirLinks).toHaveLength(2)
  })

  it('does not call fetchEvents when not authenticated', () => {
    renderPage({ userRole: 'ORGANIZER', isAuthenticated: false, isLoading: false })
    expect(apiServices.fetchEvents).not.toHaveBeenCalled()
  })

  it('calls fetchEvents with size 50 (no organizerId)', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(organizerCtx)
    await screen.findByText("Aucun événement pour l'instant.")
    expect(apiServices.fetchEvents).toHaveBeenCalledWith({ size: 50 })
  })

  it('shows "Supprimer" button for ORGANIZER', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Supprimer')).toBeInTheDocument()
  })

  it('shows "Supprimer" button for ADMIN', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(adminCtx)
    expect(await screen.findByText('Supprimer')).toBeInTheDocument()
  })

  it('hides "Supprimer" button for STUDENT', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(studentCtx)
    await screen.findByRole('heading', { name: /Mes inscriptions/i })
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument()
  })

  it('renders page heading', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(organizerCtx)
    expect(screen.getByRole('heading', { name: 'Mes événements' })).toBeInTheDocument()
    await screen.findByText("Aucun événement pour l'instant.")
  })

  it('shows delete confirmation dialog when clicking Supprimer', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    const btn = await screen.findByText('Supprimer')
    fireEvent.click(btn)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText(/Supprimer l.événement/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/Tech Talk/)).toBeInTheDocument()
  })

  it('closes dialog without deleting when clicking Annuler', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Annuler/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(apiServices.deleteEvent).not.toHaveBeenCalled()
  })

  it('removes event from list after successful deletion', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    apiServices.deleteEvent.mockResolvedValue(undefined)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^Supprimer$/ }))
    await waitFor(() => expect(screen.queryByText('Tech Talk')).not.toBeInTheDocument())
    expect(apiServices.deleteEvent).toHaveBeenCalledWith('evt-1')
  })

  it('shows error banner when deleteEvent fails', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    apiServices.deleteEvent.mockRejectedValue(new Error('Erreur serveur'))
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^Supprimer$/ }))
    expect(await screen.findByText('Erreur serveur')).toBeInTheDocument()
    // event still visible after failed delete
    expect(screen.getByText('Tech Talk')).toBeInTheDocument()
  })

  it('shows 403 error banner when deleteEvent fails with 403', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    const err = new Error('Forbidden')
    err.response = { status: 403 }
    apiServices.deleteEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Supprimer$/ }))
    expect(await screen.findByText(/Accès refusé.*organisateur/i)).toBeInTheDocument()
  })

  it('shows 409 error banner when deleteEvent fails with 409', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    const err = new Error('Conflict')
    err.response = { status: 409 }
    apiServices.deleteEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Supprimer$/ }))
    expect(await screen.findByText(/Impossible de supprimer/i)).toBeInTheDocument()
  })

  // ── Publish ──────────────────────────────────────────────────────────────

  it('shows "Publier" button for DRAFT event as ORGANIZER', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Publier')).toBeInTheDocument()
  })

  it('hides "Publier" button for STUDENT', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(studentCtx)
    await screen.findByRole('heading', { name: /Mes inscriptions/i })
    expect(screen.queryByText('Publier')).not.toBeInTheDocument()
  })

  it('publishes event and updates row status inline', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    apiServices.publishEvent.mockResolvedValue({ ...sampleEvent, status: 'PUBLISHED' })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Publier'))
    expect(await screen.findByText('Publié')).toBeInTheDocument()
    expect(apiServices.publishEvent).toHaveBeenCalledWith('evt-1')
  })

  it('shows 403 error banner when publishEvent fails with 403', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    const err = new Error('Forbidden')
    err.response = { status: 403 }
    apiServices.publishEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Publier'))
    expect(await screen.findByText(/Accès refusé.*organisateur/i)).toBeInTheDocument()
  })

  it('shows 409 error banner when publishEvent fails with 409', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    const err = new Error('Statut invalide')
    err.response = { status: 409 }
    apiServices.publishEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Publier'))
    expect(await screen.findByText('Statut invalide')).toBeInTheDocument()
  })

  it('shows generic error banner when publishEvent fails with other error', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    apiServices.publishEvent.mockRejectedValue(new Error('Réseau inaccessible'))
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Publier'))
    expect(await screen.findByText('Réseau inaccessible')).toBeInTheDocument()
  })

  // ── Cancel ───────────────────────────────────────────────────────────────

  it('shows "Annuler" button for PUBLISHED event as ORGANIZER', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Annuler')).toBeInTheDocument()
  })

  it('hides "Annuler" event button for STUDENT', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(studentCtx)
    await screen.findByRole('heading', { name: /Mes inscriptions/i })
    expect(screen.queryByText('Annuler')).not.toBeInTheDocument()
  })

  it('shows cancel confirmation dialog when clicking Annuler', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Annuler l.événement/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/Tech Talk/)).toBeInTheDocument()
  })

  it('closes cancel dialog without cancelling when clicking Fermer', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Fermer/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(apiServices.cancelEvent).not.toHaveBeenCalled()
  })

  it('cancels event and updates row status inline', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    apiServices.cancelEvent.mockResolvedValue({ ...sampleEvent, status: 'CANCELLED' })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Confirmer/i }))
    expect(await screen.findByText('Annulé')).toBeInTheDocument()
    expect(apiServices.cancelEvent).toHaveBeenCalledWith('evt-1')
  })

  it('shows 403 error banner when cancelEvent fails with 403', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    const err = new Error('Forbidden')
    err.response = { status: 403 }
    apiServices.cancelEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Confirmer/i }))
    expect(await screen.findByText(/Accès refusé.*organisateur/i)).toBeInTheDocument()
  })

  it('shows 409 error banner when cancelEvent fails with 409', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    const err = new Error('Statut invalide')
    err.response = { status: 409 }
    apiServices.cancelEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Confirmer/i }))
    expect(await screen.findByText('Statut invalide')).toBeInTheDocument()
  })

  it('shows generic error banner when cancelEvent fails with other error', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    apiServices.cancelEvent.mockRejectedValue(new Error('Réseau inaccessible'))
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Confirmer/i }))
    expect(await screen.findByText('Réseau inaccessible')).toBeInTheDocument()
  })
})

// ── Student view ─────────────────────────────────────────────────────────────

const sampleReg = {
  registrationId: 'reg-1',
  eventId: 'evt-1',
  status: 'CONFIRMED',
  registeredAt: '2026-05-01T10:00:00Z',
  waitlistPosition: null,
}

const sampleEventDetail = {
  eventId: 'evt-1',
  title: 'Tech Talk',
  category: 'Conférence',
  place: 'Amphi A',
  time: '2026-06-10T14:00:00Z',
  status: 'PUBLISHED',
}

describe('MyEventsPage (student view)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventDetail.mockResolvedValue(sampleEventDetail)
  })

  it('shows "Mes inscriptions" heading for STUDENT', async () => {
    renderPage(studentCtx)
    expect(await screen.findByRole('heading', { name: /Mes inscriptions/i })).toBeInTheDocument()
  })

  it('shows the empty state when the student has no registrations', async () => {
    renderPage(studentCtx)
    expect(await screen.findByText('Aucune inscription pour le moment')).toBeInTheDocument()
    expect(screen.getByText('Explorer les événements')).toBeInTheDocument()
  })

  it('shows an error message when fetchMyRegistrations fails', async () => {
    apiServices.fetchMyRegistrations.mockRejectedValue(
      new Error('Impossible de récupérer vos inscriptions.'),
    )
    renderPage(studentCtx)
    expect(await screen.findByText('Impossible de récupérer vos inscriptions.')).toBeInTheDocument()
  })

  it('does not call fetchMyRegistrations when not authenticated', () => {
    renderPage({ userRole: 'STUDENT', isAuthenticated: false, isLoading: false })
    expect(apiServices.fetchMyRegistrations).not.toHaveBeenCalled()
  })

  it('calls fetchMyRegistrations with size 50', async () => {
    renderPage(studentCtx)
    await screen.findByText('Aucune inscription pour le moment')
    expect(apiServices.fetchMyRegistrations).toHaveBeenCalledWith({ size: 50 })
  })

  it('renders a registration card with event details', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    expect(await screen.findByText('Tech Talk')).toBeInTheDocument()
    expect(screen.getByText('Conférence')).toBeInTheDocument()
    expect(screen.getByText('Amphi A')).toBeInTheDocument()
  })

  it('shows CONFIRMED status badge as "Confirmé"', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByText(/Confirmé/)).toBeInTheDocument()
  })

  it('shows WAITLISTED status badge with position', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ ...sampleReg, status: 'WAITLISTED', waitlistPosition: 2 }],
    })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByText(/Liste d'attente/i)).toBeInTheDocument()
    expect(screen.getByText(/pos\. 2/)).toBeInTheDocument()
  })

  it('shows PENDING status badge as "En attente"', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ ...sampleReg, status: 'PENDING' }],
    })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByText(/En attente/)).toBeInTheDocument()
  })

  it('shows CANCELLED status badge as "Annulé"', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ ...sampleReg, status: 'CANCELLED' }],
    })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByText(/Annulé/)).toBeInTheDocument()
  })

  it('shows "Annuler" button only for cancellable registrations (CONFIRMED)', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByRole('button', { name: /Annuler/i })).toBeInTheDocument()
  })

  it('hides "Annuler" button for CANCELLED registrations', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ ...sampleReg, status: 'CANCELLED' }],
    })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.queryByRole('button', { name: /Annuler/i })).not.toBeInTheDocument()
  })

  it('shows "Voir l\'événement" link for each card', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByText("Voir l'événement")).toBeInTheDocument()
  })

  it('opens cancel-registration confirmation dialog', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annuler/i }))
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: /Annuler l.inscription/i }),
    ).toBeInTheDocument()
  })

  it('closes the cancel-registration dialog without calling cancelRegistration on Fermer', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annuler/i }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Fermer/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(apiServices.cancelRegistration).not.toHaveBeenCalled()
  })

  it('removes the card after successful cancelRegistration', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    apiServices.cancelRegistration.mockResolvedValue(undefined)
    renderPage(studentCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annuler/i }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Annuler l'inscription/i }),
    )
    await waitFor(() => expect(screen.queryByText('Tech Talk')).not.toBeInTheDocument())
    expect(apiServices.cancelRegistration).toHaveBeenCalledWith('reg-1')
  })

  it('shows error banner when cancelRegistration fails', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    apiServices.cancelRegistration.mockRejectedValue(
      new Error("Impossible d'annuler votre inscription."),
    )
    renderPage(studentCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annuler/i }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Annuler l'inscription/i }),
    )
    expect(await screen.findByText(/Impossible d'annuler votre inscription/i)).toBeInTheDocument()
    // card still visible
    expect(screen.getByText('Tech Talk')).toBeInTheDocument()
  })
})
