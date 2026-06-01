import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/apiServices', () => ({
  fetchModerationCase: vi.fn(),
  fetchEventDetail: vi.fn(),
  approveModerationCase: vi.fn(),
  rejectModerationCase: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'
import AdminModerationDetailPage from './AdminModerationDetailPage'

const CASE_ID = 'case-abc-123'
const EVENT_ID = 'event-uuid-456'

const sampleCase = (overrides = {}) => ({
  caseId: CASE_ID,
  eventId: EVENT_ID,
  title: 'Conférence IA',
  organizerId: 'org-uuid-789',
  status: 'PENDING',
  createdAt: '2026-05-15T10:00:00Z',
  flags: [],
  adminNote: null,
  rejectionReason: null,
  decidedAt: null,
  ...overrides,
})

const sampleEvent = (overrides = {}) => ({
  eventId: EVENT_ID,
  title: 'Conférence IA',
  description: 'Une conférence sur les dernières avancées en IA.',
  place: 'Salle B001',
  time: '2026-06-10T14:00:00Z',
  endTime: '2026-06-10T17:00:00Z',
  capacity: 100,
  category: 'Sciences',
  tags: ['IA', 'Machine Learning'],
  bannerImageUrl: null,
  ...overrides,
})

function renderPage(caseId = CASE_ID) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/admin/moderation/${caseId}`]}>
        <Routes>
          <Route path="/admin/moderation/:caseId" element={<AdminModerationDetailPage />} />
          <Route path="/admin/moderation" element={<div>Queue page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminModerationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading / error states ────────────────────────────────────────────────

  it('renders a loading state while the case is being fetched', () => {
    apiServices.fetchModerationCase.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Chargement du cas…')).toBeInTheDocument()
  })

  it('shows an error message when the case fetch fails', async () => {
    apiServices.fetchModerationCase.mockRejectedValue(new Error('Cas introuvable.'))
    renderPage()
    expect(await screen.findByText('Cas introuvable.')).toBeInTheDocument()
  })

  // ── Case metadata ─────────────────────────────────────────────────────────

  it('renders the case title, case id and organizer id', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByText(`Cas ${CASE_ID}`)).toBeInTheDocument()
    // organizerId is rendered as text content and in the title attribute
    expect(screen.getByTitle('org-uuid-789')).toBeInTheDocument()
  })

  // ── Event detail card ─────────────────────────────────────────────────────

  it('shows a loading placeholder while the event detail is being fetched', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockReturnValue(new Promise(() => {}))
    renderPage()
    // Case resolved, event still loading
    await screen.findByText('Conférence IA') // wait for case to render
    expect(screen.getByText(/Chargement de l.événement/)).toBeInTheDocument()
  })

  it('shows an error message when the event detail fetch fails', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockRejectedValue(new Error('Not Found'))
    renderPage()
    expect(
      await screen.findByText(/Impossible de charger les détails de l.événement/),
    ).toBeInTheDocument()
  })

  it('calls fetchEventDetail with the eventId from the moderation case', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Salle B001')
    expect(apiServices.fetchEventDetail).toHaveBeenCalledWith(EVENT_ID)
  })

  it('renders event description, place, capacity, category and tags', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    expect(
      await screen.findByText('Une conférence sur les dernières avancées en IA.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Salle B001')).toBeInTheDocument()
    expect(screen.getByText('100 places')).toBeInTheDocument()
    expect(screen.getByText('Sciences')).toBeInTheDocument()
    expect(screen.getByText('IA')).toBeInTheDocument()
    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
  })

  // ── Banner ────────────────────────────────────────────────────────────────

  it('shows "Aucune bannière" message when the event has no bannerImageUrl', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent({ bannerImageUrl: null }))
    renderPage()
    expect(await screen.findByText('Aucune bannière pour cet événement.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders the banner image when bannerImageUrl is set', async () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent({ bannerImageUrl: url }))
    renderPage()
    const img = await screen.findByRole('img', { name: /Bannière de l.événement/i })
    expect(img).toHaveAttribute('src', url)
    expect(screen.queryByText('Aucune bannière pour cet événement.')).not.toBeInTheDocument()
  })

  // ── Decision actions (PENDING) ────────────────────────────────────────────

  it('shows approve and reject buttons for a PENDING case', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ status: 'PENDING' }))
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByRole('button', { name: /Approuver et publier/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Rejeter cet événement/i })).toBeInTheDocument()
  })

  it('hides approve/reject buttons for an APPROVED case', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ status: 'APPROVED' }))
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.queryByRole('button', { name: /Approuver et publier/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Rejeter cet événement/i })).not.toBeInTheDocument()
  })

  it('hides approve/reject buttons for an AUTO_APPROVED case', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ status: 'AUTO_APPROVED' }))
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.queryByRole('button', { name: /Approuver et publier/i })).not.toBeInTheDocument()
  })

  it('hides approve/reject buttons for a REJECTED case', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ status: 'REJECTED' }))
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.queryByRole('button', { name: /Approuver et publier/i })).not.toBeInTheDocument()
  })

  // ── Approve flow ──────────────────────────────────────────────────────────

  it('calls approveModerationCase with the caseId and empty note on approve', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    apiServices.approveModerationCase.mockResolvedValue({})
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getByRole('button', { name: /Approuver et publier/i }))
    await waitFor(() => {
      expect(apiServices.approveModerationCase).toHaveBeenCalledWith(CASE_ID, '')
    })
  })

  it('shows an error message when approval fails', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    apiServices.approveModerationCase.mockRejectedValue(new Error('Serveur indisponible'))
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getByRole('button', { name: /Approuver et publier/i }))
    expect(await screen.findByText('Serveur indisponible')).toBeInTheDocument()
  })

  // ── Reject flow ───────────────────────────────────────────────────────────

  it('shows the reject form when "Rejeter cet événement" is clicked', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getByRole('button', { name: /Rejeter cet événement/i }))
    // The form textarea should now be visible
    expect(screen.getByPlaceholderText(/Expliquez pourquoi/i)).toBeInTheDocument()
  })

  it('calls rejectModerationCase with caseId and reason on reject submit', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    apiServices.rejectModerationCase.mockResolvedValue({})
    renderPage()
    await screen.findByText('Conférence IA')

    fireEvent.click(screen.getByRole('button', { name: /Rejeter cet événement/i }))
    const textarea = screen.getByPlaceholderText(/Expliquez pourquoi/i)
    fireEvent.change(textarea, { target: { value: 'Contenu inapproprié' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le rejet/i }))

    await waitFor(() => {
      expect(apiServices.rejectModerationCase).toHaveBeenCalledWith(CASE_ID, 'Contenu inapproprié')
    })
  })

  it('disables the confirm-reject button when no reason is entered', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.fetchEventDetail.mockResolvedValue(sampleEvent())
    renderPage()
    await screen.findByText('Conférence IA')

    fireEvent.click(screen.getByRole('button', { name: /Rejeter cet événement/i }))
    // With an empty textarea the confirm button must be disabled
    expect(screen.getByRole('button', { name: /Confirmer le rejet/i })).toBeDisabled()
    expect(apiServices.rejectModerationCase).not.toHaveBeenCalled()
  })
})
