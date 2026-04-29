import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EditProfilePage from './EditProfilePage'

const useQueryMock = vi.hoisted(() => vi.fn())
const useMutationMock = vi.hoisted(() => vi.fn())
const useQueryClientMock = vi.hoisted(() => vi.fn())
const useAppMock = vi.hoisted(() => vi.fn())
const useParamsMock = vi.hoisted(() => vi.fn())
const useNavigateMock = vi.hoisted(() => vi.fn())
const resolveProfileIdMock = vi.hoisted(() => vi.fn())
const shouldUseMockProfileApiMock = vi.hoisted(() => vi.fn())
const normalizeProfileDataMock = vi.hoisted(() => vi.fn())
const fileToDataUrlMock = vi.hoisted(() => vi.fn())
const updateProfileMock = vi.hoisted(() => vi.fn())
const apiPutMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}))

vi.mock('../contexts/useApp', () => ({
  useApp: useAppMock,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: useParamsMock,
    useNavigate: useNavigateMock,
  }
})

vi.mock('../lib/profileUtils', () => ({
  fetchProfile: vi.fn(),
  fileToDataUrl: fileToDataUrlMock,
  normalizeProfileData: normalizeProfileDataMock,
  resolveProfileId: resolveProfileIdMock,
  shouldUseMockProfileApi: shouldUseMockProfileApiMock,
  updateProfile: updateProfileMock,
}))

vi.mock('../lib/apiClient', () => ({
  default: {
    put: apiPutMock,
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <EditProfilePage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('EditProfilePage', () => {
  it('renders missing profile id message', () => {
    useParamsMock.mockReturnValue({ id: undefined })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: null })
    resolveProfileIdMock.mockReturnValue(null)
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: null })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })

    renderPage()

    expect(screen.getByText(/Impossible d'identifier l'utilisateur courant/i)).toBeInTheDocument()
  })

  it('blocks editing another user profile', () => {
    useParamsMock.mockReturnValue({ id: 'other-id' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'me-id' })
    resolveProfileIdMock.mockReturnValue('other-id')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: null })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })

    renderPage()

    expect(screen.getByText(/Tu ne peux modifier que ton propre profil/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour à mon profil/i })).toBeInTheDocument()
  })

  it('renders loading and error states', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })

    useQueryMock.mockReturnValueOnce({ isLoading: true, error: null, data: null })
    const { rerender } = renderPage()
    expect(screen.getByText(/Chargement du profil/i)).toBeInTheDocument()

    useQueryMock.mockReturnValueOnce({ isLoading: false, error: new Error('x'), data: null })
    rerender(
      <MemoryRouter>
        <EditProfilePage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Impossible de charger le profil/i)).toBeInTheDocument()
  })

  it('renders organizer fields and handles cancel navigation', () => {
    const navigateMock = vi.fn()
    useParamsMock.mockReturnValue({ id: 'o-1' })
    useNavigateMock.mockReturnValue(navigateMock)
    useAppMock.mockReturnValue({ userRole: 'ORGANIZER', currentUserId: 'o-1' })
    resolveProfileIdMock.mockReturnValue('o-1')
    shouldUseMockProfileApiMock.mockReturnValue(true)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'o-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'o-1',
      role: 'ORGANIZER',
      display_name: 'Asso',
      avatar_url: null,
      association_profile: { description: 'Desc' },
      student_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: false })

    renderPage()

    expect(screen.getByText(/Mode mock actif/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Faculte/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }))
    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('submits student profile payload and handles avatar upload', async () => {
    const mutateMock = vi.fn()
    useParamsMock.mockReturnValue({ id: undefined })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-1' })
    resolveProfileIdMock.mockReturnValue('s-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-1',
      role: 'STUDENT',
      display_name: 'Nom Initial',
      avatar_url: null,
      student_profile: {
        faculty: 'Faculte des sciences',
        major: 'Sciences informatiques',
        degreeLevel: 'BACHELOR',
      },
      association_profile: null,
    })
    fileToDataUrlMock.mockResolvedValue('data:image/png;base64,test')
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isSuccess: false,
      isError: false,
    })

    renderPage()

    fireEvent.change(screen.getByLabelText(/Nom affiche/i), { target: { value: 'Nouveau Nom' } })
    fireEvent.change(screen.getByLabelText(/Faculte/i), {
      target: { value: 'Faculte des sciences' },
    })
    fireEvent.change(screen.getByLabelText(/Majeure/i), {
      target: { value: 'Physique' },
    })
    fireEvent.change(screen.getByLabelText(/Niveau/i), { target: { value: 'MASTER' } })

    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Avatar \(upload\)/i), {
      target: { files: [avatarFile] },
    })

    await waitFor(() => {
      expect(fileToDataUrlMock).toHaveBeenCalled()
    })

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    expect(mutateMock).toHaveBeenCalledWith({
      name: 'Nouveau Nom',
      avatarUrl: 'data:image/png;base64,test',
      description: '',
      faculty: 'Faculte des sciences',
      major: 'Physique',
      degreeLevel: 'MASTER',
    })
  })

  it('executes organizer mutation flow and onSuccess cache update', async () => {
    let mutationConfig
    const navigateMock = vi.fn()
    let cachedValue
    const setQueryDataMock = vi.fn((key, updater) => {
      cachedValue = updater({
        name: 'Avant',
        avatarUrl: null,
        association_profile: { description: 'Ancienne desc' },
      })
    })

    useParamsMock.mockReturnValue({ id: 'o-42' })
    useNavigateMock.mockReturnValue(navigateMock)
    useAppMock.mockReturnValue({ userRole: 'ORGANIZER', currentUserId: 'o-42' })
    resolveProfileIdMock.mockReturnValue('o-42')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'o-42' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'o-42',
      role: 'ORGANIZER',
      display_name: 'Asso initiale',
      avatar_url: null,
      association_profile: { description: 'Ancienne desc' },
      student_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: setQueryDataMock })

    updateProfileMock.mockResolvedValue({ id: 'o-42', name: 'Asso MAJ', avatarUrl: 'avatar-new' })
    apiPutMock.mockResolvedValue({ data: { description: 'Nouvelle desc' } })

    useMutationMock.mockImplementation((config) => {
      mutationConfig = config
      return {
        isPending: false,
        isSuccess: false,
        isError: false,
        mutate: async (variables) => {
          const updatedData = await config.mutationFn(variables)
          config.onSuccess(updatedData, variables)
        },
      }
    })

    renderPage()

    fireEvent.change(screen.getByLabelText(/Nom affiche/i), { target: { value: 'Asso MAJ' } })
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'Nouvelle desc' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith('o-42', {
        name: 'Asso MAJ',
        avatarUrl: null,
      })
    })

    expect(apiPutMock).toHaveBeenCalledWith('/api/users/o-42/association-profile', {
      description: 'Nouvelle desc',
    })
    expect(setQueryDataMock).toHaveBeenCalled()
    expect(cachedValue.name).toBe('Asso MAJ')
    expect(cachedValue.avatarUrl).toBe('avatar-new')
    expect(cachedValue.association_profile).toEqual({ description: 'Nouvelle desc' })
    expect(navigateMock).toHaveBeenCalledWith('/profile')
    expect(mutationConfig).toBeTruthy()
  })

  it('ignores 404 for student profile update during mutation', async () => {
    const navigateMock = vi.fn()

    useParamsMock.mockReturnValue({ id: undefined })
    useNavigateMock.mockReturnValue(navigateMock)
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-77' })
    resolveProfileIdMock.mockReturnValue('s-77')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-77' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-77',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: {
        faculty: 'Faculte des sciences',
        major: 'Sciences informatiques',
        degreeLevel: 'BACHELOR',
      },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })

    updateProfileMock.mockResolvedValue({ id: 's-77', name: 'Etu', avatarUrl: null })
    apiPutMock.mockRejectedValue({ response: { status: 404 } })

    useMutationMock.mockImplementation((config) => ({
      isPending: false,
      isSuccess: false,
      isError: false,
      mutate: async (variables) => {
        const updatedData = await config.mutationFn(variables)
        config.onSuccess(updatedData, variables)
      },
    }))

    renderPage()

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    await waitFor(() => {
      expect(apiPutMock).toHaveBeenCalledWith('/api/users/s-77/student-profile', {
        faculty: 'Faculte des sciences',
        major: 'Sciences informatiques',
        degreeLevel: 'BACHELOR',
      })
    })

    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('falls back to null avatar when avatar conversion fails', async () => {
    const mutateMock = vi.fn()

    useParamsMock.mockReturnValue({ id: undefined })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-1' })
    resolveProfileIdMock.mockReturnValue('s-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-1',
      role: 'STUDENT',
      display_name: 'Nom Initial',
      avatar_url: null,
      student_profile: {
        faculty: 'Faculte des sciences',
        major: 'Sciences informatiques',
        degreeLevel: 'BACHELOR',
      },
      association_profile: null,
    })
    fileToDataUrlMock.mockRejectedValue(new Error('file err'))
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isSuccess: false,
      isError: false,
    })

    renderPage()

    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Avatar \(upload\)/i), {
      target: { files: [avatarFile] },
    })

    await waitFor(() => {
      expect(fileToDataUrlMock).toHaveBeenCalled()
    })

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarUrl: null,
      }),
    )
  })

  it('shows pending/success/error mutation UI states', () => {
    useParamsMock.mockReturnValue({ id: 'o-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'ORGANIZER', currentUserId: 'o-1' })
    resolveProfileIdMock.mockReturnValue('o-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'o-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'o-1',
      role: 'ORGANIZER',
      display_name: 'Asso',
      avatar_url: null,
      association_profile: { description: 'Desc' },
      student_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isSuccess: true,
      isError: true,
    })

    renderPage()

    expect(screen.getByRole('button', { name: /Enregistrement/i })).toBeDisabled()
    expect(screen.getByText(/Profil mis a jour/i)).toBeInTheDocument()
    expect(screen.getByText(/Impossible de sauvegarder le profil/i)).toBeInTheDocument()
  })

  it('does nothing when avatar change has no selected file', async () => {
    const mutateMock = vi.fn()
    useParamsMock.mockReturnValue({ id: undefined })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-1' })
    resolveProfileIdMock.mockReturnValue('s-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-1',
      role: 'STUDENT',
      display_name: 'Nom Initial',
      avatar_url: null,
      student_profile: {
        faculty: 'Faculte des sciences',
        major: 'Sciences informatiques',
        degreeLevel: 'BACHELOR',
      },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isSuccess: false,
      isError: false,
    })

    renderPage()

    fireEvent.change(screen.getByLabelText(/Avatar \(upload\)/i), {
      target: { files: [] },
    })

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    await waitFor(() => {
      expect(fileToDataUrlMock).not.toHaveBeenCalled()
      expect(mutateMock).toHaveBeenCalled()
    })
  })

  it('keeps previousData null in onSuccess cache updater', () => {
    let mutationConfig
    const navigateMock = vi.fn()
    const setQueryDataMock = vi.fn((key, updater) => updater(null))

    useParamsMock.mockReturnValue({ id: 'o-7' })
    useNavigateMock.mockReturnValue(navigateMock)
    useAppMock.mockReturnValue({ userRole: 'ORGANIZER', currentUserId: 'o-7' })
    resolveProfileIdMock.mockReturnValue('o-7')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'o-7' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'o-7',
      role: 'ORGANIZER',
      display_name: 'Asso',
      avatar_url: null,
      association_profile: null,
      student_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: setQueryDataMock })
    useMutationMock.mockImplementation((config) => {
      mutationConfig = config
      return { mutate: vi.fn(), isPending: false, isSuccess: false, isError: false }
    })

    renderPage()

    mutationConfig.onSuccess({ user: { name: 'N' } }, { name: 'N' })

    expect(setQueryDataMock).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith('/profile')
  })

  it('rethrows non-404 errors in organizer and student mutation branches', async () => {
    let mutationConfig

    useParamsMock.mockReturnValue({ id: 'o-500' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'ORGANIZER', currentUserId: 'o-500' })
    resolveProfileIdMock.mockReturnValue('o-500')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'o-500' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'o-500',
      role: 'ORGANIZER',
      display_name: 'Asso',
      avatar_url: null,
      association_profile: null,
      student_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    updateProfileMock.mockResolvedValue({ id: 'o-500', name: 'Asso' })
    apiPutMock.mockRejectedValueOnce({ response: { status: 500 } })
    useMutationMock.mockImplementation((config) => {
      mutationConfig = config
      return { mutate: vi.fn(), isPending: false, isSuccess: false, isError: false }
    })

    renderPage()

    await expect(
      mutationConfig.mutationFn({
        name: 'Asso',
        avatarUrl: null,
        description: '',
        faculty: '',
        major: '',
        degreeLevel: '',
      }),
    ).rejects.toEqual({ response: { status: 500 } })

    // Student path
    useParamsMock.mockReturnValue({ id: undefined })
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-500' })
    resolveProfileIdMock.mockReturnValue('s-500')
    normalizeProfileDataMock.mockReturnValue({
      id: 's-500',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: null,
      association_profile: null,
    })
    apiPutMock.mockRejectedValueOnce({ response: { status: 500 } })

    renderPage()

    await expect(
      mutationConfig.mutationFn({
        name: 'Etu',
        avatarUrl: null,
        description: '',
        faculty: '',
        major: '',
        degreeLevel: '',
      }),
    ).rejects.toEqual({ response: { status: 500 } })
  })
})
