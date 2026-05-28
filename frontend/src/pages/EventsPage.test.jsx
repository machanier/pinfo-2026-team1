import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EventsPage from './EventsPage'

vi.mock('../lib/apiServices', () => ({
  fetchEvents: vi.fn(),
}))

vi.mock('../contexts/useApp', () => ({
  useApp: () => ({ savedEvents: [], isFavorite: () => false, toggleFavorite: () => {} }),
}))

import * as apiServices from '../lib/apiServices'

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/search']}>
        <EventsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sampleEvent = {
  eventId: 'evt-1',
  title: 'Tech Talk 2026',
  category: 'Conférence',
  place: 'Amphi A',
  time: '2026-06-10T14:00:00Z',
  capacity: 100,
  description: 'Une conférence sur le futur de la tech.',
}

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page heading', () => {
    apiServices.fetchEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('heading', { name: /Rechercher un événement/i })).toBeInTheDocument()
  })

  it('shows no event cards while loading', () => {
    apiServices.fetchEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.queryByText('Tech Talk 2026')).not.toBeInTheDocument()
  })

  it('shows empty message when no events', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    expect(await screen.findByText('Aucun événement publié pour le moment.')).toBeInTheDocument()
  })

  it('shows error message on fetch failure', async () => {
    apiServices.fetchEvents.mockRejectedValue(new Error('Network error'))
    renderPage()
    expect(
      await screen.findByText('Impossible de charger les événements. Veuillez réessayer.'),
    ).toBeInTheDocument()
  })

  it('renders event title and category', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    expect(await screen.findByText('Tech Talk 2026')).toBeInTheDocument()
    // Le redesign affiche la catégorie à deux endroits : le chip de filtre et le
    // badge de la carte — d'où getAllByText.
    expect(screen.getAllByText('Conférence').length).toBeGreaterThan(0)
  })

  it('renders event place', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByText(/Amphi A/)).toBeInTheDocument()
  })

  it('renders event description snippet', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByText('Une conférence sur le futur de la tech.')).toBeInTheDocument()
  })

  it('each event card links to /events/:id', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    const link = await screen.findByRole('link', { name: /Tech Talk 2026/i })
    expect(link).toHaveAttribute('href', '/events/evt-1')
  })

  it('calls fetchEvents with status PUBLISHED on mount', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    await screen.findByText('Aucun événement publié pour le moment.')
    expect(apiServices.fetchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', page: 0 }),
    )
  })

  it('renders multiple event cards', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [sampleEvent, { ...sampleEvent, eventId: 'evt-2', title: 'BioHack Summit' }],
      totalPages: 1,
    })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByText('BioHack Summit')).toBeInTheDocument()
  })

  it('hides pagination when totalPages <= 1', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.queryByRole('button', { name: /Précédent/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Suivant/i })).not.toBeInTheDocument()
  })

  it('shows pagination buttons when totalPages > 1', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByRole('button', { name: /← Précédent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Suivant →/i })).toBeInTheDocument()
  })

  it('Précédent is disabled on first page', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByRole('button', { name: /← Précédent/i })).toBeDisabled()
  })

  it('shows page indicator', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByText('Page 1 / 3')).toBeInTheDocument()
  })

  it('hides category badge when event has no category', async () => {
    apiServices.fetchEvents.mockResolvedValue({
      content: [{ ...sampleEvent, category: null }],
      totalPages: 1,
    })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.queryByText('Conférence')).not.toBeInTheDocument()
  })

  it('clicking Suivant advances to the next page', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')

    fireEvent.click(screen.getByRole('button', { name: /Suivant →/i }))

    await waitFor(() =>
      expect(apiServices.fetchEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })),
    )
  })

  it('clicking Précédent after advancing returns to the previous page', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')

    fireEvent.click(screen.getByRole('button', { name: /Suivant →/i }))
    await waitFor(() =>
      expect(apiServices.fetchEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })),
    )

    fireEvent.click(screen.getByRole('button', { name: /← Précédent/i }))
    await waitFor(() =>
      expect(apiServices.fetchEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 0 })),
    )
  })

  // ── Banner image ──────────────────────────────────────────────────────────

  it('renders a banner image when bannerImageUrl is set', async () => {
    const eventWithBanner = {
      ...sampleEvent,
      bannerImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/banner.jpg',
    }
    apiServices.fetchEvents.mockResolvedValue({ content: [eventWithBanner], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    const img = screen.getByRole('img', { name: /Bannière/i })
    expect(img).toBeInTheDocument()
    // cloudinaryOptimized inserts the width transform parameter
    expect(img.getAttribute('src')).toContain('w_800,q_auto:best,f_auto')
  })

  it('renders the gradient strip and no banner img when bannerImageUrl is absent', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.queryByRole('img', { name: /Bannière/i })).not.toBeInTheDocument()
  })

  // ── Filters ───────────────────────────────────────────────────────────────

  const otherEvent = {
    eventId: 'evt-2',
    title: 'BioHack Summit',
    category: 'Sport',
    place: 'Biotech Lab',
    time: '2026-07-01T09:00:00Z',
    capacity: 50,
    description: 'Un hackathon biotech.',
  }

  it('filters the list by search term', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent, otherEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    fireEvent.change(screen.getByPlaceholderText(/Rechercher un événement/), {
      target: { value: 'BioHack' },
    })
    expect(screen.queryByText('Tech Talk 2026')).not.toBeInTheDocument()
    expect(screen.getByText('BioHack Summit')).toBeInTheDocument()
  })

  it('filters the list by category chip', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent, otherEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    fireEvent.click(screen.getByRole('button', { name: 'Sport' }))
    expect(screen.queryByText('Tech Talk 2026')).not.toBeInTheDocument()
    expect(screen.getByText('BioHack Summit')).toBeInTheDocument()
  })

  it('reorders the list when the sort changes to descending', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent, otherEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'date_desc' } })
    expect(screen.getByText('Tech Talk 2026')).toBeInTheDocument()
    expect(screen.getByText('BioHack Summit')).toBeInTheDocument()
  })

  it('hides events not in favourites when the favourites filter is on', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    // The mocked useApp exposes savedEvents: [], so the filter empties the list.
    fireEvent.click(screen.getByRole('button', { name: 'Favoris' }))
    expect(screen.queryByText('Tech Talk 2026')).not.toBeInTheDocument()
  })

  it('clears active filters', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    fireEvent.change(screen.getByPlaceholderText(/Rechercher un événement/), {
      target: { value: 'zzz' },
    })
    expect(screen.queryByText('Tech Talk 2026')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Effacer les filtres/ }))
    expect(screen.getByText('Tech Talk 2026')).toBeInTheDocument()
  })
})
