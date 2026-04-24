import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage'

const useQueryMock = vi.hoisted(() => vi.fn())
const useAppMock = vi.hoisted(() => vi.fn())
const useParamsMock = vi.hoisted(() => vi.fn())
const resolveProfileIdMock = vi.hoisted(() => vi.fn())
const normalizeProfileDataMock = vi.hoisted(() => vi.fn())
const formatDateMock = vi.hoisted(() => vi.fn())
const fetchProfileMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('../contexts/useApp', () => ({
  useApp: useAppMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: useParamsMock,
  }
})

vi.mock('../lib/profileUtils', () => ({
  fetchProfile: fetchProfileMock,
  formatDate: formatDateMock,
  mockModeEnabled: false,
  normalizeProfileData: normalizeProfileDataMock,
  resolveProfileId: resolveProfileIdMock,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  it('renders missing profile id message', () => {
    useParamsMock.mockReturnValue({ id: undefined })
    useAppMock.mockReturnValue({ userRole: 'STUDENT', savedEvents: [], currentUserId: null })
    resolveProfileIdMock.mockReturnValue(null)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: null })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })

    renderPage()

    expect(screen.getByText(/Impossible d'identifier l'utilisateur courant/i)).toBeInTheDocument()
  })

  it('renders loading state', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useAppMock.mockReturnValue({ userRole: 'STUDENT', savedEvents: [], currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-1')
    useQueryMock.mockReturnValue({ isLoading: true, error: null, data: null })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })

    renderPage()

    expect(screen.getByText(/Chargement du profil/i)).toBeInTheDocument()
  })

  it('renders error state', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useAppMock.mockReturnValue({ userRole: 'STUDENT', savedEvents: [], currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-1')
    useQueryMock.mockReturnValue({ isLoading: false, error: new Error('fail'), data: null })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })

    renderPage()

    expect(screen.getByText(/Impossible de charger le profil/i)).toBeInTheDocument()
  })

  it('renders student profile with edit link for own profile', () => {
    useParamsMock.mockReturnValue({ id: undefined })
    useAppMock.mockReturnValue({ userRole: 'STUDENT', savedEvents: [1, 2], currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-1')
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-1' } })
    normalizeProfileDataMock.mockReturnValue({
      role: 'STUDENT',
      association_profile: null,
      student_profile: {
        faculty: 'Informatique',
        major: 'IA',
        degreeLevel: 'MASTER',
      },
      avatar_url: null,
      display_name: 'Alice',
      email: 'alice@example.com',
      created_at: '2025-02-10T14:30:00Z',
    })
    formatDateMock.mockReturnValue('10 fevrier 2025')

    renderPage()

    expect(screen.getByRole('heading', { name: /Profil Utilisateur/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Editer mon profil/i })).toBeInTheDocument()
    expect(screen.getByText(/Profil etudiant/i)).toBeInTheDocument()
    expect(screen.getByText(/Evenements sauvegardes: 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Membre depuis le 10 fevrier 2025/i)).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders organizer profile without edit link when visiting another profile', () => {
    useParamsMock.mockReturnValue({ id: 'u-2' })
    useAppMock.mockReturnValue({ userRole: 'ORGANIZER', savedEvents: [], currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-2')
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-2' } })
    normalizeProfileDataMock.mockReturnValue({
      role: 'ORGANIZER',
      association_profile: {
        description: 'Association active',
      },
      student_profile: null,
      avatar_url: 'https://example.com/avatar.png',
      display_name: 'Asso Beta',
      email: 'asso@example.com',
      created_at: '2024-01-01T00:00:00Z',
    })
    formatDateMock.mockReturnValue('1 janvier 2024')

    renderPage()

    expect(screen.getByText(/Organisateur/i)).toBeInTheDocument()
    expect(screen.getByText(/À propos/i)).toBeInTheDocument()
    expect(screen.getByText(/Association active/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Editer mon profil/i })).not.toBeInTheDocument()
    expect(screen.getByAltText(/Avatar utilisateur/i)).toHaveAttribute(
      'src',
      'https://example.com/avatar.png',
    )
  })
})
