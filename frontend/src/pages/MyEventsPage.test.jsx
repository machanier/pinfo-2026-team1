import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import MyEventsPage from './MyEventsPage'

vi.mock('../lib/apiServices', () => ({
  fetchEvents: vi.fn(),
  deleteEvent: vi.fn(),
  submitEvent: vi.fn(),
  cancelEvent: vi.fn(),
  fetchMyRegistrations: vi.fn(),
  cancelRegistration: vi.fn(),
  fetchEventDetail: vi.fn(),
  createEventAnnouncement: vi.fn(),
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

function renderPageWithState(contextValue, locationState) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={[{ pathname: '/my-events', state: locationState }]}>
          <Routes>
            <Route path="/my-events" element={<MyEventsPage />} />
          </Routes>
        </MemoryRouter>
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

  it('shows "Modifier" link for ORGANIZER on DRAFT event', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Modifier')).toBeInTheDocument()
  })

  it('hides "Modifier" link for ORGANIZER on CANCELLED event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, status: 'CANCELLED' }],
    })
    renderPage(organizerCtx)
    await screen.findByText('Annulé')
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument()
  })

  it('hides "Modifier" link for ADMIN on CANCELLED event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, status: 'CANCELLED' }],
    })
    renderPage(adminCtx)
    await screen.findByText('Annulé')
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument()
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
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Annuler/i }))
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

  it('shows "Supprimer" button for a PUBLISHED event (deletable at any status)', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] }) // sampleEvent is PUBLISHED
    renderPage(organizerCtx)
    expect(await screen.findByText('Supprimer')).toBeInTheDocument()
  })

  it('warns that participants will be notified when deleting a PUBLISHED event', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/inscriptions seront annulées/i)).toBeInTheDocument()
  })

  it('does not show the participant warning when deleting a DRAFT event', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Supprimer'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByText(/inscriptions seront annulées/i)).not.toBeInTheDocument()
  })

  // ── Submit ───────────────────────────────────────────────────────────────

  it('shows "Soumettre" button for DRAFT event as ORGANIZER', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(organizerCtx)
    expect(await screen.findByText('Soumettre')).toBeInTheDocument()
  })

  it('hides "Soumettre" button for STUDENT', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    renderPage(studentCtx)
    await screen.findByRole('heading', { name: /Mes inscriptions/i })
    expect(screen.queryByText('Soumettre')).not.toBeInTheDocument()
  })

  it('submits event and updates row status inline', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    apiServices.submitEvent.mockResolvedValue({ ...sampleEvent, status: 'PENDING_MODERATION' })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Soumettre'))
    expect(await screen.findByText('En modération')).toBeInTheDocument()
    expect(apiServices.submitEvent).toHaveBeenCalledWith('evt-1')
  })

  it('shows 403 error banner when submitEvent fails with 403', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    const err = new Error('Forbidden')
    err.response = { status: 403 }
    apiServices.submitEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Soumettre'))
    expect(await screen.findByText(/Accès refusé.*organisateur/i)).toBeInTheDocument()
  })

  it('shows 409 error banner when submitEvent fails with 409', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    const err = new Error('Statut invalide')
    err.response = { status: 409 }
    apiServices.submitEvent.mockRejectedValue(err)
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Soumettre'))
    expect(await screen.findByText('Statut invalide')).toBeInTheDocument()
  })

  it('shows generic error banner when submitEvent fails with other error', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [{ ...sampleEvent, status: 'DRAFT' }] })
    apiServices.submitEvent.mockRejectedValue(new Error('Réseau inaccessible'))
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Soumettre'))
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
    expect(within(dialog).getByRole('textbox')).toBeInTheDocument()
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
    expect(apiServices.cancelEvent).toHaveBeenCalledWith('evt-1', undefined)
  })

  it('passes reason to cancelEvent when provided', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    apiServices.cancelEvent.mockResolvedValue({ ...sampleEvent, status: 'CANCELLED' })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Intervenant indisponible' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmer/i }))
    expect(await screen.findByText('Annulé')).toBeInTheDocument()
    expect(apiServices.cancelEvent).toHaveBeenCalledWith('evt-1', 'Intervenant indisponible')
  })

  it('clears reason when dialog is closed with Fermer', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByText('Annuler'))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Un motif' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /Fermer/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Reopen — reason should be cleared
    fireEvent.click(screen.getByText('Annuler'))
    expect(within(screen.getByRole('dialog')).getByRole('textbox')).toHaveValue('')
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

  it('shows CANCELLED status badge as "Annulé" for a cancelled registration', async () => {
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

  it('shows "Voir l\'événement" link for non-cancelled cards', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.getByText("Voir l'événement")).toBeInTheDocument()
  })

  it('hides "Voir l\'événement" link for CANCELLED registrations', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({
      content: [{ ...sampleReg, status: 'CANCELLED' }],
    })
    renderPage(studentCtx)
    await screen.findByText('Tech Talk')
    expect(screen.queryByText("Voir l'événement")).not.toBeInTheDocument()
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

  it('shows "Annulé" when fetchEventDetail returns a 404 for a CONFIRMED registration', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    const axiosErr = { response: { status: 404 } }
    apiServices.fetchEventDetail.mockRejectedValue(
      Object.assign(new Error('Événement non trouvé.'), { cause: axiosErr }),
    )
    renderPage(studentCtx)
    await screen.findByText('Événement annulé') // fallback title – wait for render
    // The status badge is a <span>; the fallback title is an <a> — distinguish them
    const badgeSpans = screen.getAllByText(/Annulé/i).filter((el) => el.tagName === 'SPAN')
    expect(badgeSpans.length).toBeGreaterThan(0)
  })

  it('keeps original status when fetchEventDetail fails with a non-404 error', async () => {
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [sampleReg] })
    apiServices.fetchEventDetail.mockRejectedValue(
      new Error('Impossible de récupérer cet événement.'),
    )
    renderPage(studentCtx)
    await screen.findByText('Événement annulé') // fallback title – wait for render
    // Badge must show the original CONFIRMED status, not CANCELLED
    expect(screen.getByText('Confirmé')).toBeInTheDocument()
    const cancelledBadges = screen.queryAllByText(/Annulé/i).filter((el) => el.tagName === 'SPAN')
    expect(cancelledBadges).toHaveLength(0)
  })
})

// ── Announce dialog (MyEventsPage) ───────────────────────────────────────────

describe('MyEventsPage — announce dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent] })
  })

  it('shows "Annonce" button for ORGANIZER on PUBLISHED event', async () => {
    renderPage(organizerCtx)
    expect(await screen.findByRole('button', { name: /Annonce/i })).toBeInTheDocument()
  })

  it('shows "Annonce" button for ADMIN on PUBLISHED event', async () => {
    renderPage(adminCtx)
    expect(await screen.findByRole('button', { name: /Annonce/i })).toBeInTheDocument()
  })

  it('hides "Annonce" button for STUDENT', async () => {
    renderPage(studentCtx)
    await screen.findByText('Mes inscriptions')
    expect(screen.queryByRole('button', { name: /Annonce/i })).not.toBeInTheDocument()
  })

  it('opens announce dialog when "Annonce" is clicked', async () => {
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annonce/i }))
    const dialog = screen.getByRole('dialog', { name: /nouvelle annonce/i })
    expect(within(dialog).getByText(/Tech Talk/)).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox')).toBeInTheDocument()
  })

  it('closes announce dialog on Annuler', async () => {
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annonce/i }))
    const dialog = screen.getByRole('dialog', { name: /nouvelle annonce/i })
    fireEvent.click(within(dialog).getByRole('button', { name: /Annuler/i }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /nouvelle annonce/i })).not.toBeInTheDocument(),
    )
    expect(apiServices.createEventAnnouncement).not.toHaveBeenCalled()
  })

  it('submits the announcement and shows success message', async () => {
    apiServices.createEventAnnouncement.mockResolvedValue({})
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annonce/i }))
    const dialog = screen.getByRole('dialog', { name: /nouvelle annonce/i })
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Salle changée au bât. A' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Publier/i }))
    await screen.findByText(/Annonce publiée avec succès/i)
    expect(apiServices.createEventAnnouncement).toHaveBeenCalledWith(
      'evt-1',
      'Salle changée au bât. A',
    )
  })

  it('shows error when createEventAnnouncement fails', async () => {
    apiServices.createEventAnnouncement.mockRejectedValue(
      new Error("Impossible de publier l'annonce."),
    )
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annonce/i }))
    const dialog = screen.getByRole('dialog', { name: /nouvelle annonce/i })
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Test' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Publier/i }))
    expect(await within(dialog).findByText(/Impossible de publier l'annonce/i)).toBeInTheDocument()
  })

  it('closes announce dialog after success via Fermer button', async () => {
    apiServices.createEventAnnouncement.mockResolvedValue({})
    renderPage(organizerCtx)
    fireEvent.click(await screen.findByRole('button', { name: /Annonce/i }))
    const dialog = screen.getByRole('dialog', { name: /nouvelle annonce/i })
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Info importante' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /Publier/i }))
    await screen.findByText(/Annonce publiée avec succès/i)
    fireEvent.click(screen.getByRole('button', { name: /Fermer/i }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /nouvelle annonce/i })).not.toBeInTheDocument(),
    )
  })
})

// ── PENDING_MODERATION status badge & sub-texts ───────────────────────────────

describe('MyEventsPage — PENDING_MODERATION and DRAFT sub-texts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventDetail.mockResolvedValue(null)
  })

  it('shows "En modération" badge for PENDING_MODERATION event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, status: 'PENDING_MODERATION' }],
    })
    renderPage(organizerCtx)
    expect(await screen.findByText('En modération')).toBeInTheDocument()
  })

  it('shows "Actualisation auto en cours…" sub-text for PENDING_MODERATION event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, status: 'PENDING_MODERATION' }],
    })
    renderPage(organizerCtx)
    expect(await screen.findByText('Actualisation auto en cours…')).toBeInTheDocument()
  })

  it('shows "Si rejeté, corrigez puis soumettez à nouveau." sub-text for DRAFT event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, status: 'DRAFT' }],
    })
    renderPage(organizerCtx)
    expect(
      await screen.findByText('Si rejeté, corrigez puis soumettez à nouveau.'),
    ).toBeInTheDocument()
  })

  it('hides "Modifier" link for PENDING_MODERATION event', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, status: 'PENDING_MODERATION' }],
    })
    renderPage(organizerCtx)
    await screen.findByText('En modération')
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument()
  })
})

// ── toastInfo banner ──────────────────────────────────────────────────────────

describe('MyEventsPage — toastInfo banner from navigation state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventDetail.mockResolvedValue(null)
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
  })

  it('displays the toastInfo banner when location.state.toastInfo is set', async () => {
    renderPageWithState(organizerCtx, {
      toastInfo:
        'Votre événement a été soumis à la modération et sera temporairement masqué du public.',
    })
    expect(
      await screen.findByText(
        'Votre événement a été soumis à la modération et sera temporairement masqué du public.',
      ),
    ).toBeInTheDocument()
  })

  it('does not show the toastInfo banner when location.state has no toastInfo', async () => {
    renderPageWithState(organizerCtx, {})
    await screen.findByText("Aucun événement pour l'instant.")
    expect(screen.queryByText(/soumis à la modération/i)).not.toBeInTheDocument()
  })
})

// ── Status change notifications (polling) ────────────────────────────────────
// Note: polling-based status change notification tests rely on React Query
// refetch intervals (15 s). We test the underlying statusNotifications state
// logic by rendering with events that have already changed status, which
// triggers the useEffect on the second render pass.
describe('MyEventsPage — status change notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiServices.fetchMyRegistrations.mockResolvedValue({ content: [] })
    apiServices.fetchEventDetail.mockResolvedValue(null)
  })

  it('shows a "published" notification when a PENDING_MODERATION event is now PUBLISHED', async () => {
    // First render: event is PENDING_MODERATION (tracked in prev state)
    apiServices.fetchEvents
      .mockResolvedValueOnce({ content: [{ ...sampleEvent, status: 'PENDING_MODERATION' }] })
      .mockResolvedValueOnce({ content: [{ ...sampleEvent, status: 'PUBLISHED' }] })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <AppContext.Provider value={organizerCtx}>
          <BrowserRouter>
            <MyEventsPage />
          </BrowserRouter>
        </AppContext.Provider>
      </QueryClientProvider>,
    )
    // wait for first fetch to settle
    expect(await screen.findByText('En modération')).toBeInTheDocument()

    // invalidate and refetch — React Query will call the mock again
    await act(async () => {
      await qc.invalidateQueries({ queryKey: ['myEvents'] })
    })

    expect(await screen.findByText(/a été approuvé et publié/i)).toBeInTheDocument()
  })

  it('shows a "rejected" notification when a PENDING_MODERATION event is now DRAFT', async () => {
    apiServices.fetchEvents
      .mockResolvedValueOnce({ content: [{ ...sampleEvent, status: 'PENDING_MODERATION' }] })
      .mockResolvedValueOnce({ content: [{ ...sampleEvent, status: 'DRAFT' }] })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <AppContext.Provider value={organizerCtx}>
          <BrowserRouter>
            <MyEventsPage />
          </BrowserRouter>
        </AppContext.Provider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('En modération')).toBeInTheDocument()

    await act(async () => {
      await qc.invalidateQueries({ queryKey: ['myEvents'] })
    })

    expect(await screen.findByText(/a été rejeté par la modération/i)).toBeInTheDocument()
  })

  it('dismisses a status notification when the dismiss button is clicked', async () => {
    apiServices.fetchEvents
      .mockResolvedValueOnce({ content: [{ ...sampleEvent, status: 'PENDING_MODERATION' }] })
      .mockResolvedValueOnce({ content: [{ ...sampleEvent, status: 'PUBLISHED' }] })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <AppContext.Provider value={organizerCtx}>
          <BrowserRouter>
            <MyEventsPage />
          </BrowserRouter>
        </AppContext.Provider>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('En modération')).toBeInTheDocument()

    await act(async () => {
      await qc.invalidateQueries({ queryKey: ['myEvents'] })
    })

    await screen.findByText(/a été approuvé et publié/i)
    // The dismiss button is any button adjacent to the notification
    const dismissBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent === '×' || b.getAttribute('aria-label') === 'Fermer')
    if (dismissBtn) fireEvent.click(dismissBtn)

    await waitFor(() =>
      expect(screen.queryByText(/a été approuvé et publié/i)).not.toBeInTheDocument(),
    )
  })

  describe('search, status filter & sort toolbar', () => {
    const filterEvents = [
      {
        eventId: 'f1',
        title: 'Concert Jazz',
        category: 'Musique',
        place: 'Uni Dufour',
        time: '2026-05-10T14:00:00Z',
        status: 'PUBLISHED',
      },
      {
        eventId: 'f2',
        title: 'Atelier Cuisine',
        category: 'Atelier',
        place: 'Cuisine',
        time: '2026-06-20T18:00:00Z',
        status: 'DRAFT',
      },
      {
        eventId: 'f3',
        title: 'Hackathon UNIGE',
        category: 'Tech',
        place: 'Battelle',
        time: '2026-04-01T09:00:00Z',
        status: 'PUBLISHED',
      },
      // Missing title on purpose: exercises the `title ?? ''` guard in the filter.
      {
        eventId: 'f4',
        title: undefined,
        category: 'Divers',
        place: 'Salle X',
        time: '2026-07-01T09:00:00Z',
        status: 'PUBLISHED',
      },
    ]

    // The status and sort dropdowns are identified by an option they each carry,
    // so the lookup stays correct regardless of other selects on the page.
    const statusSelect = () =>
      screen.getAllByRole('combobox').find((s) => within(s).queryByText('Tous les statuts'))
    const sortSelect = () =>
      screen.getAllByRole('combobox').find((s) => within(s).queryByText('Date ↓'))

    it('filters the table by title search (and tolerates a missing title)', async () => {
      apiServices.fetchEvents.mockResolvedValue({ content: filterEvents })
      renderPage(organizerCtx)
      await screen.findByText('Concert Jazz')

      fireEvent.change(screen.getByPlaceholderText('Rechercher par titre…'), {
        target: { value: 'jazz' },
      })

      expect(screen.getByText('Concert Jazz')).toBeInTheDocument()
      expect(screen.queryByText('Atelier Cuisine')).not.toBeInTheDocument()
      expect(screen.queryByText('Hackathon UNIGE')).not.toBeInTheDocument()
    })

    it('filters the table by status', async () => {
      apiServices.fetchEvents.mockResolvedValue({ content: filterEvents })
      renderPage(organizerCtx)
      await screen.findByText('Concert Jazz')

      fireEvent.change(statusSelect(), { target: { value: 'DRAFT' } })

      expect(screen.getByText('Atelier Cuisine')).toBeInTheDocument()
      expect(screen.queryByText('Concert Jazz')).not.toBeInTheDocument()
      expect(screen.queryByText('Hackathon UNIGE')).not.toBeInTheDocument()
    })

    it('reorders the table when sorting by date ascending', async () => {
      apiServices.fetchEvents.mockResolvedValue({ content: filterEvents })
      renderPage(organizerCtx)
      await screen.findByText('Hackathon UNIGE')

      fireEvent.change(sortSelect(), { target: { value: 'date_asc' } })

      // Earliest event (April) must now be the first data row.
      const firstDataRow = screen.getAllByRole('row')[1]
      expect(within(firstDataRow).getByText('Hackathon UNIGE')).toBeInTheDocument()
    })

    it('shows a no-match message when filters exclude every event', async () => {
      apiServices.fetchEvents.mockResolvedValue({ content: filterEvents })
      renderPage(organizerCtx)
      await screen.findByText('Concert Jazz')

      fireEvent.change(screen.getByPlaceholderText('Rechercher par titre…'), {
        target: { value: 'zzz-aucun-match' },
      })

      expect(
        screen.getByText('Aucun événement ne correspond à ces filtres.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Concert Jazz')).not.toBeInTheDocument()
    })
  })
})
