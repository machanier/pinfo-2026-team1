import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/apiServices', () => ({
  fetchEventDetail: vi.fn(),
}))

const appValue = vi.hoisted(() => ({
  savedEvents: [],
  isFavorite: () => true,
  toggleFavorite: vi.fn(),
  isAuthenticated: true,
  login: vi.fn(),
}))
vi.mock('../contexts/useApp', () => ({ useApp: () => appValue }))

import * as apiServices from '../lib/apiServices'
import FavoritesPage from './FavoritesPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FavoritesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appValue.savedEvents = []
  })

  it('shows an empty state with a link to search when there are no favourites', () => {
    appValue.savedEvents = []
    renderPage()
    expect(screen.getByText(/Ta liste de favoris est vide/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explorer les événements/i })).toHaveAttribute(
      'href',
      '/search',
    )
    expect(apiServices.fetchEventDetail).not.toHaveBeenCalled()
  })

  it('renders one card per favourited event', async () => {
    appValue.savedEvents = ['e1', 'e2']
    apiServices.fetchEventDetail.mockImplementation((id) =>
      Promise.resolve({
        eventId: id,
        title: id === 'e1' ? 'Conférence IA' : 'Atelier design',
        time: '2026-07-01T10:00:00Z',
        place: 'Uni Mail',
      }),
    )
    renderPage()
    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByText('Atelier design')).toBeInTheDocument()
  })

  it('drops favourites whose event no longer exists (404)', async () => {
    appValue.savedEvents = ['ok', 'gone']
    apiServices.fetchEventDetail.mockImplementation((id) =>
      id === 'ok'
        ? Promise.resolve({ eventId: 'ok', title: 'Toujours là', time: '2026-07-01T10:00:00Z' })
        : Promise.reject(new Error('404')),
    )
    renderPage()
    expect(await screen.findByText('Toujours là')).toBeInTheDocument()
    expect(
      await screen.findByText(/ne sont plus disponibles|Toujours là/i),
    ).toBeInTheDocument()
  })
})
