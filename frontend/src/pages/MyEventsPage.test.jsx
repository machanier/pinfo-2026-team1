import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import MyEventsPage from './MyEventsPage'

vi.mock('../lib/apiServices', () => ({
  fetchEvents: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'

function renderPage(contextValue) {
  return render(
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <MyEventsPage />
      </BrowserRouter>
    </AppContext.Provider>,
  )
}

const organizerCtx = { userRole: 'ORGANIZER', currentUserId: 'user-1' }
const adminCtx = { userRole: 'ADMIN', currentUserId: 'user-admin' }
const studentCtx = { userRole: 'STUDENT', currentUserId: 'user-student' }

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

  it('shows loading state when currentUserId is null', () => {
    renderPage({ userRole: 'ORGANIZER', currentUserId: null })
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
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

  it('does not call fetchEvents when currentUserId is null', () => {
    renderPage({ userRole: 'ORGANIZER', currentUserId: null })
    expect(apiServices.fetchEvents).not.toHaveBeenCalled()
  })

  it('calls fetchEvents with correct organizerId and size', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(organizerCtx)
    await screen.findByText("Aucun événement pour l'instant.")
    expect(apiServices.fetchEvents).toHaveBeenCalledWith({ organizerId: 'user-1', size: 50 })
  })

  it('renders page heading', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [] })
    renderPage(organizerCtx)
    expect(screen.getByRole('heading', { name: 'Mes événements' })).toBeInTheDocument()
  })
})
