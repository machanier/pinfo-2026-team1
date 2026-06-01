import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/apiServices', () => ({
  fetchModerationQueue: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'
import AdminModerationPage from './AdminModerationPage'

const samplePage = (overrides = {}) => ({
  content: [
    {
      caseId: 'c1',
      title: 'Conférence IA',
      organizerId: 'org-1',
      status: 'PENDING',
      createdAt: '2026-05-15T10:00:00Z',
    },
    {
      caseId: 'c2',
      title: 'Tournoi de volley',
      organizerId: 'org-2',
      status: 'PENDING',
      createdAt: '2026-05-16T10:00:00Z',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  ...overrides,
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/moderation']}>
        <Routes>
          <Route path="/admin/moderation" element={<AdminModerationPage />} />
          <Route path="/admin/moderation/:caseId" element={<div>Detail target</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the heading and the four status filter tabs', () => {
    apiServices.fetchModerationQueue.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('heading', { name: /File de modération/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'En attente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auto-approuvé' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approuvé' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeté' })).toBeInTheDocument()
  })

  it('fetches PENDING cases on first render with default page and size', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
    renderPage()
    await screen.findByText('Aucun cas dans cette catégorie')
    expect(apiServices.fetchModerationQueue).toHaveBeenCalledWith({
      status: 'PENDING',
      page: 0,
      size: 20,
    })
  })

  it('shows the loading state while the query is pending', () => {
    apiServices.fetchModerationQueue.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('shows the empty state when the API returns no cases', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
    renderPage()
    expect(await screen.findByText('Aucun cas dans cette catégorie')).toBeInTheDocument()
  })

  it('renders one row per case with title, organizer and a status badge', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    renderPage()
    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByText('Tournoi de volley')).toBeInTheDocument()
    expect(screen.getByText('org-1')).toBeInTheDocument()
    expect(screen.getByText('org-2')).toBeInTheDocument()
    expect(screen.getAllByText('En attente').length).toBeGreaterThanOrEqual(3)
  })

  it('shows a friendly error banner when the fetch fails', async () => {
    apiServices.fetchModerationQueue.mockRejectedValue(new Error('boom'))
    renderPage()
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('refires the request with the new status when a tab is clicked', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getByRole('button', { name: 'Rejeté' }))
    expect(apiServices.fetchModerationQueue).toHaveBeenLastCalledWith({
      status: 'REJECTED',
      page: 0,
      size: 20,
    })
  })

  it('disables Précédent on the first page and enables Suivant when more pages exist', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(
      samplePage({ totalElements: 50, totalPages: 3 }),
    )
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByRole('button', { name: /Précédent/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Suivant/i })).not.toBeDisabled()
  })

  it('advances to the next page when Suivant is clicked', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(
      samplePage({ totalElements: 50, totalPages: 3 }),
    )
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    expect(apiServices.fetchModerationQueue).toHaveBeenLastCalledWith({
      status: 'PENDING',
      page: 1,
      size: 20,
    })
  })
})
