import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrganizerProfilePage from './OrganizerProfilePage'

const useQueryMock = vi.hoisted(() => vi.fn())
const useParamsMock = vi.hoisted(() => vi.fn())
const fetchEventsMock = vi.hoisted(() => vi.fn())
const fetchProfileMock = vi.hoisted(() => vi.fn())
const formatDateMock = vi.hoisted(() => vi.fn())
const normalizeProfileDataMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: useParamsMock,
  }
})

vi.mock('../lib/apiServices', () => ({
  fetchEvents: fetchEventsMock,
}))

vi.mock('../lib/profileUtils', () => ({
  fetchProfile: fetchProfileMock,
  formatDate: formatDateMock,
  normalizeProfileData: normalizeProfileDataMock,
}))

// useQuery is called twice, in order: (1) events query, then (2) profile query.
function mockQueries(eventsResult, profileResult) {
  useQueryMock.mockReturnValueOnce(eventsResult).mockReturnValueOnce(profileResult)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <OrganizerProfilePage />
    </MemoryRouter>,
  )
}

describe('OrganizerProfilePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useParamsMock.mockReturnValue({ id: 'org-1' })
  })

  it('renders the loading state while events are fetched', () => {
    mockQueries(
      { isLoading: true, isError: false, data: null },
      { isLoading: true, isError: false, data: null },
    )

    renderPage()

    expect(screen.getByRole('heading', { name: /Profil organisateur/i })).toBeInTheDocument()
    expect(screen.getByText(/Chargement des événements/i)).toBeInTheDocument()
  })

  it('renders published events and the name coming from the loaded profile', () => {
    mockQueries(
      {
        isLoading: false,
        isError: false,
        data: { content: [{ eventId: 'e-1', title: 'Festival Tech', organizerName: 'Club X' }] },
      },
      { isLoading: false, isError: false, data: { id: 'org-1', role: 'ORGANIZER' } },
    )
    normalizeProfileDataMock.mockReturnValue({
      display_name: 'Asso Alpha',
      association_profile: { description: 'Association très dynamique' },
      avatar_url: null,
      created_at: '2024-01-01T00:00:00Z',
    })
    formatDateMock.mockReturnValue('1 janvier 2024')

    renderPage()

    expect(screen.getByRole('heading', { name: 'Asso Alpha' })).toBeInTheDocument()
    expect(screen.getByText(/Association très dynamique/i)).toBeInTheDocument()
    expect(screen.getByText(/Membre depuis le 1 janvier 2024/i)).toBeInTheDocument()
    expect(screen.getByText('Festival Tech')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir →/i })).toHaveAttribute('href', '/events/e-1')
  })

  it('falls back to the event organizerName when the profile is unavailable (anonymous visitor)', () => {
    mockQueries(
      {
        isLoading: false,
        isError: false,
        data: {
          content: [{ eventId: 'e-2', title: 'Concert de rentrée', organizerName: 'Orchestre Universitaire' }],
        },
      },
      { isLoading: false, isError: true, data: null },
    )

    renderPage()

    expect(screen.getByRole('heading', { name: 'Orchestre Universitaire' })).toBeInTheDocument()
    expect(screen.getByText('Concert de rentrée')).toBeInTheDocument()
    // Default "À propos" copy when no association description is available.
    expect(screen.getByText(/création et de la gestion d'événements/i)).toBeInTheDocument()
    expect(normalizeProfileDataMock).not.toHaveBeenCalled()
  })

  it('shows the empty state when the organizer has no published events', () => {
    mockQueries(
      { isLoading: false, isError: false, data: { content: [] } },
      { isLoading: false, isError: false, data: null },
    )

    renderPage()

    expect(screen.getByText(/Aucun événement publié pour le moment/i)).toBeInTheDocument()
    // No profile and no events → generic fallback name.
    expect(screen.getByRole('heading', { name: 'Organisateur' })).toBeInTheDocument()
  })

  it('shows an error message when the events query fails', () => {
    mockQueries(
      { isLoading: false, isError: true, data: null },
      { isLoading: false, isError: true, data: null },
    )

    renderPage()

    expect(
      screen.getByText(/Impossible de charger les événements de cet organisateur/i),
    ).toBeInTheDocument()
  })

  it('renders the organizer logo when an avatar url is available', () => {
    mockQueries(
      { isLoading: false, isError: false, data: { content: [] } },
      { isLoading: false, isError: false, data: { id: 'org-1' } },
    )
    normalizeProfileDataMock.mockReturnValue({
      display_name: 'Asso Beta',
      association_profile: { description: 'Active' },
      avatar_url: 'https://example.com/logo.png',
      created_at: null,
    })

    renderPage()

    expect(screen.getByAltText(/Logo de Asso Beta/i)).toHaveAttribute(
      'src',
      'https://example.com/logo.png',
    )
  })
})
