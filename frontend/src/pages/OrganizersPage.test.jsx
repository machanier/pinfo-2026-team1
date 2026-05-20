/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrganizersPage from './OrganizersPage'

const useQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  keepPreviousData: undefined,
}))

vi.mock('../lib/apiServices', () => ({
  fetchOrganizers: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <OrganizersPage />
    </MemoryRouter>,
  )
}

const BASE_ORGANIZER = {
  userId: 'org-1',
  associationName: 'Asso Alpha',
  description: 'Une association dynamique',
  logoUrl: null,
  verified: false,
  upcomingEventCount: 0,
}

describe('OrganizersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and search input', () => {
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: null })

    renderPage()

    expect(screen.getByRole('heading', { name: /Organisateurs/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Rechercher une association/i)).toBeInTheDocument()
  })

  it('renders skeleton cards while loading', () => {
    useQueryMock.mockReturnValue({ isLoading: true, error: null, data: null })

    renderPage()

    // 6 skeleton cards rendered via animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(6)
  })

  it('renders organizer cards when data is loaded', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        content: [
          BASE_ORGANIZER,
          { ...BASE_ORGANIZER, userId: 'org-2', associationName: 'Asso Beta' },
        ],
        totalElements: 2,
        totalPages: 1,
      },
    })

    renderPage()

    expect(screen.getByText('Asso Alpha')).toBeInTheDocument()
    expect(screen.getByText('Asso Beta')).toBeInTheDocument()
    expect(screen.getByText(/2 organisateurs/i)).toBeInTheDocument()
  })

  it('links each card to the organizer profile', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 1, totalPages: 1 },
    })

    renderPage()

    const link = screen.getByRole('link', { name: /Asso Alpha/i })
    expect(link).toHaveAttribute('href', '/organizers/org-1')
  })

  it('shows verified badge for verified organizers', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        content: [{ ...BASE_ORGANIZER, verified: true }],
        totalElements: 1,
        totalPages: 1,
      },
    })

    renderPage()

    expect(screen.getByText(/✓ Vérifié/i)).toBeInTheDocument()
  })

  it('shows upcoming event count when greater than zero', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        content: [{ ...BASE_ORGANIZER, upcomingEventCount: 3 }],
        totalElements: 1,
        totalPages: 1,
      },
    })

    renderPage()

    expect(screen.getByText(/3 événements à venir/i)).toBeInTheDocument()
  })

  it('shows singular event count label', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        content: [{ ...BASE_ORGANIZER, upcomingEventCount: 1 }],
        totalElements: 1,
        totalPages: 1,
      },
    })

    renderPage()

    expect(screen.getByText(/1 événement à venir/i)).toBeInTheDocument()
  })

  it('shows organizer logo when logoUrl is set', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        content: [{ ...BASE_ORGANIZER, logoUrl: 'https://example.com/logo.png' }],
        totalElements: 1,
        totalPages: 1,
      },
    })

    renderPage()

    expect(screen.getByAltText('Asso Alpha')).toHaveAttribute('src', 'https://example.com/logo.png')
  })

  it('shows initial letter avatar when logoUrl is absent', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 1, totalPages: 1 },
    })

    renderPage()

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders error message on API failure', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: new Error('network error'),
      data: null,
    })

    renderPage()

    expect(screen.getByText(/Impossible de charger les organisateurs/i)).toBeInTheDocument()
  })

  it('shows generic empty message when no organizers exist', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [], totalElements: 0, totalPages: 0 },
    })

    renderPage()

    expect(screen.getByText(/Aucun organisateur disponible pour le moment/i)).toBeInTheDocument()
  })

  it('does not show pagination when there is only one page', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 1, totalPages: 1 },
    })

    renderPage()

    expect(screen.queryByText(/← Précédent/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Suivant →/i)).not.toBeInTheDocument()
  })

  it('shows pagination controls when totalPages > 1', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 25, totalPages: 3 },
    })

    renderPage()

    expect(screen.getByText(/← Précédent/i)).toBeInTheDocument()
    expect(screen.getByText(/Suivant →/i)).toBeInTheDocument()
    expect(screen.getByText(/Page 1 \/ 3/i)).toBeInTheDocument()
  })

  it('disables previous button on the first page', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 25, totalPages: 3 },
    })

    renderPage()

    expect(screen.getByText(/← Précédent/i).closest('button')).toBeDisabled()
    expect(screen.getByText(/Suivant →/i).closest('button')).not.toBeDisabled()
  })

  it('advances to the next page when Suivant is clicked', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 25, totalPages: 3 },
    })

    renderPage()

    fireEvent.click(screen.getByText(/Suivant →/i))

    expect(screen.getByText(/Page 2 \/ 3/i)).toBeInTheDocument()
    expect(screen.getByText(/← Précédent/i).closest('button')).not.toBeDisabled()
  })

  it('disables next button on the last page', () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: { content: [BASE_ORGANIZER], totalElements: 25, totalPages: 3 },
    })

    renderPage()

    fireEvent.click(screen.getByText(/Suivant →/i))
    fireEvent.click(screen.getByText(/Suivant →/i))

    expect(screen.getByText(/Page 3 \/ 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Suivant →/i).closest('button')).toBeDisabled()
  })
})
