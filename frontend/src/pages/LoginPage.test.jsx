/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Auth0 mock ───────────────────────────────────────────────────────────────
const { loginWithRedirect, useAuth0Mock } = vi.hoisted(() => {
  const loginFn = vi.fn()
  return { loginWithRedirect: loginFn, useAuth0Mock: vi.fn() }
})

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => useAuth0Mock(),
}))

// ── apiServices mock ─────────────────────────────────────────────────────────
vi.mock('../lib/apiServices', () => ({
  fetchPublicEvents: vi.fn(),
}))

// LoginPage consumes useApp (signInDemo) and renders EventCard, which reads
// isFavorite/toggleFavorite — stub the context so we don't need AppProvider/Auth0.
vi.mock('../contexts/useApp', () => ({
  useApp: () => ({
    signInDemo: () => {},
    savedEvents: [],
    isFavorite: () => false,
    toggleFavorite: () => {},
  }),
}))

import * as apiServices from '../lib/apiServices'
import LoginPage from './LoginPage'

// ── helpers ──────────────────────────────────────────────────────────────────
function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage(path = '/login', state = null) {
  const [pathname, search] = path.includes('?') ? path.split('?') : [path, '']
  return render(
    <QueryClientProvider client={makeQC()}>
      <MemoryRouter initialEntries={[{ pathname, search: search ? `?${search}` : '', state }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<div>Profile landing</div>} />
          <Route path="/my-events" element={<div>My events landing</div>} />
        </Routes>
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

// ── tests ────────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH0_AUDIENCE', 'test-aud')
    apiServices.fetchPublicEvents.mockReturnValue(new Promise(() => {}))
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  // ── Loading state ──────────────────────────────────────────────────────────
  it('hides buttons while Auth0 is loading', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      error: null,
      loginWithRedirect,
    })
    renderPage()
    expect(screen.queryByRole('button', { name: /Se connecter/i })).not.toBeInTheDocument()
  })

  // ── Hero buttons ───────────────────────────────────────────────────────────
  it('renders "Se connecter" and "Créer un compte" buttons', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    renderPage()
    expect(screen.getByRole('button', { name: /^Se connecter$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Créer un compte/i })).toBeInTheDocument()
  })

  it('calls loginWithRedirect when "Se connecter" is clicked', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^Se connecter$/i }))
    expect(loginWithRedirect).toHaveBeenCalledTimes(1)
    expect(loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({
          audience: 'test-aud',
          scope: 'openid profile email',
        }),
      }),
    )
  })

  it('calls loginWithRedirect with screen_hint signup when "Créer un compte" is clicked', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Créer un compte/i }))
    expect(loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({ screen_hint: 'signup' }),
      }),
    )
  })

  // ── Auth error ─────────────────────────────────────────────────────────────
  it('shows error message when Auth0 returns an error', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: { message: 'Connexion refusée' },
      loginWithRedirect,
    })
    renderPage()
    expect(screen.getByText(/Connexion refusée/i)).toBeInTheDocument()
  })

  it('prefers error_description over message', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: { error_description: 'Email non vérifié', message: 'access_denied' },
      loginWithRedirect,
    })
    renderPage()
    expect(screen.getByText(/Email non vérifié/i)).toBeInTheDocument()
  })

  // ── Authenticated redirect ─────────────────────────────────────────────────
  it('redirects to /profile when already authenticated', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    renderPage()
    expect(screen.getByText('Profile landing')).toBeInTheDocument()
  })

  it('redirects to location.state.returnTo when authenticated', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    renderPage('/login', { returnTo: '/my-events' })
    expect(screen.getByText('My events landing')).toBeInTheDocument()
  })

  // ── Events list ────────────────────────────────────────────────────────────
  it('shows skeleton cards while events are loading', () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows error message when events fetch fails', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockRejectedValue(new Error('Network error'))
    renderPage()
    expect(await screen.findByText(/Impossible de charger les événements/i)).toBeInTheDocument()
  })

  it('shows empty state when no events are published', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    expect(await screen.findByText(/Aucun événement publié pour le moment/i)).toBeInTheDocument()
  })

  it('renders event title and category badge', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    expect(await screen.findByText('Tech Talk 2026')).toBeInTheDocument()
    expect(screen.getByText('Conférence')).toBeInTheDocument()
  })

  it('renders event place and description', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByText(/Amphi A/)).toBeInTheDocument()
    expect(screen.getByText(/Une conférence sur le futur de la tech/)).toBeInTheDocument()
  })

  it('calls fetchEvents with status PUBLISHED on mount', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    await screen.findByText(/Aucun événement publié pour le moment/i)
    expect(apiServices.fetchPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', page: 0 }),
    )
  })

  it('requests only upcoming events via a server-side `after` filter', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [], totalPages: 0 })
    renderPage()
    await screen.findByText(/Aucun événement publié pour le moment/i)
    // The page must rely on server-side date filtering (an `after` timestamp)
    // rather than filtering client-side after pagination — otherwise totalPages
    // is wrong and pages can come back empty. See PR review of #151.
    expect(apiServices.fetchPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({ after: expect.any(String) }),
    )
  })

  // ── Pagination ─────────────────────────────────────────────────────────────
  it('does not show pagination when totalPages <= 1', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 1 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.queryByRole('button', { name: /Précédent/i })).not.toBeInTheDocument()
  })

  it('shows pagination buttons when totalPages > 1', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByRole('button', { name: /Précédent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Suivant/i })).toBeInTheDocument()
  })

  it('"Précédent" is disabled on first page', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    expect(screen.getByRole('button', { name: /Précédent/i })).toBeDisabled()
  })

  it('clicking "Suivant" fetches next page', async () => {
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockResolvedValue({ content: [sampleEvent], totalPages: 3 })
    renderPage()
    await screen.findByText('Tech Talk 2026')
    fireEvent.click(screen.getByRole('button', { name: /Suivant/i }))
    await waitFor(() =>
      expect(apiServices.fetchPublicEvents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      ),
    )
  })

  it('handles loginWithRedirect error gracefully', async () => {
    loginWithRedirect.mockRejectedValueOnce(new Error('popup closed'))
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^Se connecter$/i }))
    // Button should still be present after error (no crash)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Se connecter$/i })).toBeInTheDocument(),
    )
  })

  it('handles signup loginWithRedirect error gracefully', async () => {
    loginWithRedirect.mockRejectedValueOnce(new Error('popup closed'))
    useAuth0Mock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginWithRedirect,
    })
    apiServices.fetchPublicEvents.mockReturnValue(new Promise(() => {}))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Créer un compte/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Créer un compte/i })).toBeInTheDocument(),
    )
  })
})
