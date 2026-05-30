import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/apiServices', () => ({
  fetchEvents: vi.fn(),
}))
vi.mock('../contexts/useApp', () => ({
  useApp: () => ({ savedEvents: [], isFavorite: () => false, toggleFavorite: () => {} }),
}))

import * as apiServices from '../lib/apiServices'
import HomePage from './HomePage'

const events = [
  {
    eventId: 'e1',
    title: 'Conf IA',
    category: 'Conférence',
    place: 'Uni Dufour',
    time: '2026-06-01T18:00:00Z',
    bannerUrl: 'https://example.com/banner.jpg',
    description: 'Une conférence',
  },
  {
    eventId: 'e2',
    title: 'Volley Cup',
    category: 'Sport',
    place: 'Champel',
    time: '2026-06-10T13:00:00Z',
    description: 'Un tournoi',
  },
]

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<div>Search landing</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hero heading', () => {
    apiServices.fetchEvents.mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(screen.getByRole('heading', { name: /intéresse aujourd'hui/i })).toBeInTheDocument()
  })

  it('shows the empty state when there are no events', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderHome()
    expect(await screen.findByText('Aucun événement publié pour le moment.')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', async () => {
    apiServices.fetchEvents.mockRejectedValue(new Error('boom'))
    renderHome()
    expect(await screen.findByText(/Impossible de charger les événements/)).toBeInTheDocument()
  })

  it('renders the featured event, the category section and the remaining cards', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: events, totalPages: 1 })
    renderHome()
    // Earliest event is featured.
    expect(await screen.findByText('Conf IA')).toBeInTheDocument()
    expect(screen.getByText(/À la une/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parcourir par catégorie' })).toBeInTheDocument()
    // The non-featured event renders as a card.
    expect(screen.getByText('Volley Cup')).toBeInTheDocument()
  })

  it('navigates to /search with the typed query on submit', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderHome()
    fireEvent.change(screen.getByPlaceholderText(/Rechercher un événement/), {
      target: { value: 'yoga' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }))
    expect(await screen.findByText('Search landing')).toBeInTheDocument()
  })

  it('navigates to /search with no query when the field is empty', async () => {
    apiServices.fetchEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }))
    expect(await screen.findByText('Search landing')).toBeInTheDocument()
  })

  it('renders the featured banner from bannerImageUrl', async () => {
    const withBannerImageUrl = [
      { ...events[0], bannerUrl: null, bannerImageUrl: 'https://example.com/banner-img.jpg' },
      events[1],
    ]
    apiServices.fetchEvents.mockResolvedValue({ content: withBannerImageUrl, totalPages: 1 })
    renderHome()
    await screen.findByText('Conf IA')
    const img = screen.getByRole('img', { name: /Bannière/i })
    expect(img).toHaveAttribute('src', 'https://example.com/banner-img.jpg')
  })

  it('prefers bannerImageUrl over bannerUrl for the featured event', async () => {
    const withBoth = [
      {
        ...events[0],
        bannerUrl: 'https://example.com/old.jpg',
        bannerImageUrl: 'https://example.com/new.jpg',
      },
      events[1],
    ]
    apiServices.fetchEvents.mockResolvedValue({ content: withBoth, totalPages: 1 })
    renderHome()
    await screen.findByText('Conf IA')
    const img = screen.getByRole('img', { name: /Bannière/i })
    expect(img).toHaveAttribute('src', 'https://example.com/new.jpg')
  })

  it('shows no featured image and keeps the pink gradient when event has no banner', async () => {
    const noBanner = [
      { ...events[0], bannerUrl: null, bannerImageUrl: null },
      { ...events[1], bannerUrl: null, bannerImageUrl: null },
    ]
    apiServices.fetchEvents.mockResolvedValue({ content: noBanner, totalPages: 1 })
    renderHome()
    await screen.findByText('Conf IA')
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })
})
