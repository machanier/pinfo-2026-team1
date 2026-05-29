import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/apiServices', () => ({
  fetchModerationCase: vi.fn(),
  approveModerationCase: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'
import AdminModerationCasePage from './AdminModerationCasePage'

const sampleCase = (overrides = {}) => ({
  caseId: 'c1',
  eventId: 'evt-1',
  announcementId: null,
  title: 'Conférence IA',
  organizerId: 'org-1',
  status: 'PENDING',
  flags: [],
  adminNote: null,
  rejectionReason: null,
  createdAt: '2026-05-15T10:00:00Z',
  decidedAt: null,
  ...overrides,
})

function renderPage(caseId = 'c1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/admin/moderation/${caseId}`]}>
        <Routes>
          <Route path="/admin/moderation/:caseId" element={<AdminModerationCasePage />} />
          <Route path="/admin/moderation" element={<div>Queue page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminModerationCasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the back link to the queue and a loading state while fetching', () => {
    apiServices.fetchModerationCase.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('link', { name: /Retour à la file/i })).toHaveAttribute(
      'href',
      '/admin/moderation',
    )
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('shows a friendly error banner when the fetch fails', async () => {
    apiServices.fetchModerationCase.mockRejectedValue(new Error('Cas introuvable.'))
    renderPage()
    expect(await screen.findByText('Cas introuvable.')).toBeInTheDocument()
  })

  it('renders the title, status badge and organizer for an Événement case', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Conférence IA' })).toBeInTheDocument()
    expect(screen.getByText('Événement')).toBeInTheDocument()
    expect(screen.getByText('org-1')).toBeInTheDocument()
    expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(1)
  })

  it('labels the case as "Annonce" when announcementId is present', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ announcementId: 'ann-1' }))
    renderPage()
    expect(await screen.findByText('Annonce')).toBeInTheDocument()
  })

  it('shows the "Décidé le" meta when decidedAt is present', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(
      sampleCase({ status: 'APPROVED', decidedAt: '2026-05-20T15:00:00Z' }),
    )
    renderPage()
    expect(await screen.findByText('Décidé le')).toBeInTheDocument()
  })

  it('shows "Aucun signalement automatique." when the flags array is empty', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ flags: [] }))
    renderPage()
    expect(await screen.findByText('Aucun signalement automatique.')).toBeInTheDocument()
  })

  it('renders each flag with field, reason and a confidence percentage', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(
      sampleCase({
        flags: [
          { field: 'title', reason: 'Possible spam', confidence: 0.85 },
          { field: 'description', reason: 'Prohibited keyword', confidence: 0.3 },
        ],
      }),
    )
    renderPage()
    expect(await screen.findByText('title')).toBeInTheDocument()
    expect(screen.getByText('description')).toBeInTheDocument()
    expect(screen.getByText('Possible spam')).toBeInTheDocument()
    expect(screen.getByText('Prohibited keyword')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('renders the admin note when present', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(
      sampleCase({ status: 'APPROVED', adminNote: 'Validé après vérification' }),
    )
    renderPage()
    expect(await screen.findByText('Validé après vérification')).toBeInTheDocument()
    expect(screen.getByText("Note de l'administrateur")).toBeInTheDocument()
  })

  it('renders the rejection reason when present', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(
      sampleCase({ status: 'REJECTED', rejectionReason: 'Contenu inapproprié' }),
    )
    renderPage()
    expect(await screen.findByText('Contenu inapproprié')).toBeInTheDocument()
    expect(screen.getByText('Motif du rejet')).toBeInTheDocument()
  })

  it('shows the Approuver button when the case is PENDING', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    renderPage()
    expect(await screen.findByRole('button', { name: /Approuver/i })).toBeInTheDocument()
  })

  it('does not show the Approuver button when the case is not PENDING', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase({ status: 'APPROVED' }))
    renderPage()
    await screen.findByText('Événement')
    expect(screen.queryByRole('button', { name: /Approuver/i })).not.toBeInTheDocument()
  })

  it('opens the approve dialog with the optional admin-note textarea', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Approuver/i }))
    expect(await screen.findByRole('heading', { name: /Approuver ce cas/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Note interne/)).toBeInTheDocument()
  })

  it('confirming approval calls approveModerationCase and redirects to the queue', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.approveModerationCase.mockResolvedValue(sampleCase({ status: 'APPROVED' }))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Approuver/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Confirmer l'approbation/i }))
    await waitFor(() => {
      expect(apiServices.approveModerationCase).toHaveBeenCalledWith('c1', undefined)
    })
    expect(await screen.findByText('Queue page')).toBeInTheDocument()
  })

  it('surfaces a friendly error message when approval fails', async () => {
    apiServices.fetchModerationCase.mockResolvedValue(sampleCase())
    apiServices.approveModerationCase.mockRejectedValue(
      new Error("Ce cas n'est plus en attente : il a déjà été traité."),
    )
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Approuver/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Confirmer l'approbation/i }))
    expect(
      await screen.findByText("Ce cas n'est plus en attente : il a déjà été traité."),
    ).toBeInTheDocument()
  })
})
