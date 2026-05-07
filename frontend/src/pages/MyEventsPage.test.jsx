import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import MyEventsPage from './MyEventsPage'

vi.mock('../lib/apiServices', () => ({
  fetchEvents: vi.fn(),
  deleteEvent: vi.fn(),
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
    await screen.findByText("Aucun événement pour l'instant.")
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
    await screen.findByText('Tech Talk')
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
    await screen.findByText('Tech Talk')
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
})
