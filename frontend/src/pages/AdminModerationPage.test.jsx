import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../lib/apiServices', () => ({
  fetchModerationQueue: vi.fn(),
  fetchEventDetail: vi.fn(),
  deleteEvent: vi.fn(),
}))

import * as apiServices from '../lib/apiServices'
import AdminModerationPage from './AdminModerationPage'

const samplePage = (overrides = {}) => ({
  content: [
    {
      caseId: 'c1',
      eventId: 'evt-1',
      title: 'Conférence IA',
      organizerId: 'org-1',
      status: 'PENDING',
      createdAt: '2026-05-15T10:00:00Z',
    },
    {
      caseId: 'c2',
      eventId: 'evt-2',
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

function renderPageWithState(locationState) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/admin/moderation', state: locationState }]}>
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
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    renderPage()
    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByText('Tournoi de volley')).toBeInTheDocument()
    // organizer UUIDs are resolved to a readable name via the event
    await waitFor(() => expect(screen.getAllByText('Club UNIGE')).toHaveLength(2))
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

  it('shows success toast from location state', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    renderPageWithState({ toastSuccess: 'Événement approuvé et publié.' })
    expect(await screen.findByText('Événement approuvé et publié.')).toBeInTheDocument()
  })

  it('disables Précédent on page 0 and enables it on page 1', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(
      samplePage({ totalElements: 50, totalPages: 3 }),
    )
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByRole('button', { name: /Précédent/i })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    // Wait for page 1 data to load (buttons are inside !isLoading block)
    await screen.findByText('Conférence IA')
    expect(screen.getByRole('button', { name: /Précédent/i })).not.toBeDisabled()
  })

  it('disables Suivant when on the last page', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(
      samplePage({ totalElements: 40, totalPages: 2 }),
    )
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    // Wait for page 1 data to load before asserting button state
    await screen.findByText('Conférence IA')
    expect(screen.getByRole('button', { name: /Suivant/i })).toBeDisabled()
  })

  it('resets to page 0 when switching status tabs', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(
      samplePage({ totalElements: 50, totalPages: 3 }),
    )
    renderPage()
    await screen.findByText('Conférence IA')
    // advance to page 1
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    expect(apiServices.fetchModerationQueue).toHaveBeenLastCalledWith({
      status: 'PENDING',
      page: 1,
      size: 20,
    })
    // switch to APPROVED tab → should reset page to 0
    fireEvent.click(screen.getByRole('button', { name: /^Approuvé$/ }))
    expect(apiServices.fetchModerationQueue).toHaveBeenLastCalledWith({
      status: 'APPROVED',
      page: 0,
      size: 20,
    })
  })

  it('filters the visible cases by title', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.change(screen.getByPlaceholderText(/Filtrer par titre/i), {
      target: { value: 'volley' },
    })
    expect(screen.queryByText('Conférence IA')).not.toBeInTheDocument()
    expect(screen.getByText('Tournoi de volley')).toBeInTheDocument()
  })

  it('shows a no-match message when the filter matches nothing', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.change(screen.getByPlaceholderText(/Filtrer par titre/i), {
      target: { value: 'zzz-aucun' },
    })
    expect(screen.getByText(/Aucun cas ne correspond à ce filtre/i)).toBeInTheDocument()
  })

  it('deletes the underlying event and removes the row', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    apiServices.deleteEvent.mockResolvedValue(undefined)
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer/i })[0])
    const dialog = screen.getByText("Supprimer l'événement").closest('[role="dialog"]')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(apiServices.deleteEvent).toHaveBeenCalledWith('evt-1'))
    expect(await screen.findByText('Événement supprimé.')).toBeInTheDocument()
    expect(screen.queryByText('Conférence IA')).not.toBeInTheDocument()
  })

  it('shows an error in the dialog when deletion fails', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    apiServices.deleteEvent.mockRejectedValue(new Error('Échec suppression.'))
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer/i })[0])
    const dialog = screen.getByText("Supprimer l'événement").closest('[role="dialog"]')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByText('Échec suppression.')).toBeInTheDocument()
  })

  it('cancels deletion without calling the API', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    renderPage()
    await screen.findByText('Conférence IA')
    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer/i })[0])
    const dialog = screen.getByText("Supprimer l'événement").closest('[role="dialog"]')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByText("Supprimer l'événement")).not.toBeInTheDocument()
    expect(apiServices.deleteEvent).not.toHaveBeenCalled()
  })

  it('shows a contextual hint that changes with the selected tab', async () => {
    apiServices.fetchModerationQueue.mockResolvedValue(samplePage())
    apiServices.fetchEventDetail.mockResolvedValue({ organizerName: 'Club UNIGE' })
    renderPage()
    await screen.findByText('Conférence IA')
    expect(screen.getByText(/Examinez chaque cas/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Auto-approuvé' }))
    expect(
      await screen.findByText(/Approuvés automatiquement par le filtre IA/i),
    ).toBeInTheDocument()
  })
})
