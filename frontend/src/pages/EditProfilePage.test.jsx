import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditProfilePage from './EditProfilePage'
import { uploadAvatarToCloudinary } from '../lib/cloudinaryAvatar'

const useQueryMock = vi.hoisted(() => vi.fn())
const useMutationMock = vi.hoisted(() => vi.fn())
const useQueryClientMock = vi.hoisted(() => vi.fn())
const useAppMock = vi.hoisted(() => vi.fn())
const useParamsMock = vi.hoisted(() => vi.fn())
const useNavigateMock = vi.hoisted(() => vi.fn())
const resolveProfileIdMock = vi.hoisted(() => vi.fn())
const shouldUseMockProfileApiMock = vi.hoisted(() => vi.fn())
const normalizeProfileDataMock = vi.hoisted(() => vi.fn())
const updateProfileMock = vi.hoisted(() => vi.fn())
const apiPutMock = vi.hoisted(() => vi.fn())
const apiPostMock = vi.hoisted(() => vi.fn())
const deleteUserMock = vi.hoisted(() => vi.fn())
const originalFetch = globalThis.fetch
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

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
  normalizeProfileData: normalizeProfileDataMock,
  resolveProfileId: resolveProfileIdMock,
  shouldUseMockProfileApi: shouldUseMockProfileApiMock,
  updateProfile: updateProfileMock,
}))

vi.mock('../lib/apiClient', () => ({
  default: {
    put: apiPutMock,
    post: apiPostMock,
  },
}))

vi.mock('../lib/apiServices', () => ({
  deleteUser: deleteUserMock,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <EditProfilePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
  // Avatar uploads first ask the backend to mint a Cloudinary signature
  // (apiClient.post); default it to a valid payload so the upload-path tests
  // proceed to the Cloudinary fetch. The API secret never reaches the client.
  apiPostMock.mockResolvedValue({
    data: {
      cloudName: 'demo',
      apiKey: 'test-key',
      timestamp: 1735680000,
      publicId: 'avatars/auth0_s-1',
      overwrite: true,
      uploadPreset: 'unigevents_profil',
      signature: 'test-signature',
    },
  })
  // jsdom does not implement URL.createObjectURL — mock it so handleAvatarChange
  // can stage a file without throwing TypeError in the test environment.
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-preview-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  globalThis.fetch = originalFetch
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
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

  it('renders 403 error message when account has no role', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })
    const err = new Error('Forbidden')
    err.response = { status: 403 }
    useQueryMock.mockReturnValue({ isLoading: false, error: err, data: null })

    renderPage()

    expect(screen.getByText(/Accès refusé \(403\)/i)).toBeInTheDocument()
    expect(screen.getByText(/rôle assigné/i)).toBeInTheDocument()
  })

  it('renders 401 error message when session is expired', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1' })
    resolveProfileIdMock.mockReturnValue('u-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
    normalizeProfileDataMock.mockReturnValue({ role: 'STUDENT' })
    const err = new Error('Unauthorized')
    err.response = { status: 401 }
    useQueryMock.mockReturnValue({ isLoading: false, error: err, data: null })

    renderPage()

    expect(screen.getByText(/Session expirée/i)).toBeInTheDocument()
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
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
      }),
    })
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

    // Upload is deferred to form submission — fetch must NOT be called yet.
    expect(globalThis.fetch).not.toHaveBeenCalled()

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith({
        name: 'Nouveau Nom',
        avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
        description: '',
        faculty: 'Faculte des sciences',
        major: 'Physique',
        degreeLevel: 'MASTER',
      })
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
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Upload rate limited.' } }),
    })

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

    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Avatar \(upload\)/i), {
      target: { files: [avatarFile] },
    })

    // Upload is deferred — fetch not called yet.
    expect(globalThis.fetch).not.toHaveBeenCalled()

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    // After submit, Cloudinary is called and the error message appears.
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled()
      expect(screen.getByText(/Upload rate limited/i)).toBeInTheDocument()
    })

    // Save is aborted on upload failure — mutate must NOT have been called.
    expect(mutateMock).not.toHaveBeenCalled()
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

  it('rejects oversized avatar at file pick time without staging or uploading it', async () => {
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

    // 3 MB JPEG — over the 2 MB MAX_AVATAR_BYTES ceiling defined in EditProfilePage.jsx.
    const oversizedContent = new Uint8Array(3_000_000)
    const oversizedFile = new File([oversizedContent], 'huge.jpg', { type: 'image/jpeg' })

    fireEvent.change(screen.getByLabelText(/Avatar \(upload\)/i), {
      target: { files: [oversizedFile] },
    })

    // The error message is rendered with the formatted size from formatAvatarSize.
    expect(
      screen.getByText(/Avatar trop lourd \(3\.0 MB\)\. Maximum autoris[eé] : 2\.0 MB\./i),
    ).toBeInTheDocument()

    // Preview was never staged — URL.createObjectURL is not called for rejected files.
    expect(URL.createObjectURL).not.toHaveBeenCalled()

    // Submitting the form still saves the rest of the profile (just without avatar upload).
    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer le profil/i }).closest('form'))

    await waitFor(() => {
      // No Cloudinary call was triggered for the oversized file.
      expect(globalThis.fetch).not.toHaveBeenCalled()
      // The mutation is still invoked so other field edits aren't lost.
      expect(mutateMock).toHaveBeenCalled()
    })
  })

  it('uploadAvatarToCloudinary throws on oversized files (defense-in-depth)', async () => {
    // This guard mirrors the handleAvatarChange check and is here so any future
    // caller that bypasses the form (drop handler, paste handler, programmatic
    // upload) still hits a size gate. Exercise it directly since the UI path
    // can no longer reach it once handleAvatarChange filters the input.
    const oversizedContent = new Uint8Array(2_500_000)
    const oversizedFile = new File([oversizedContent], 'too-big.jpg', { type: 'image/jpeg' })

    await expect(uploadAvatarToCloudinary(oversizedFile)).rejects.toThrow(
      /Avatar trop lourd \(2\.5 MB\)\. Maximum autoris[eé] : 2\.0 MB\./,
    )
    // No network call was attempted — the guard short-circuits before fetch.
    expect(globalThis.fetch).not.toHaveBeenCalled()
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
      expect(globalThis.fetch).not.toHaveBeenCalled()
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

  it('includes custom faculty and major options when values are missing from defaults', () => {
    useParamsMock.mockReturnValue({ id: 's-9' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-9' })
    resolveProfileIdMock.mockReturnValue('s-9')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-9' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-9',
      role: 'STUDENT',
      display_name: 'Nom',
      avatar_url: null,
      student_profile: {
        faculty: 'Faculte inconnue',
        major: 'Option inedite',
        degreeLevel: 'BACHELOR',
      },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    })

    renderPage()

    expect(screen.getByRole('option', { name: /Faculte inconnue/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Option inedite/i })).toBeInTheDocument()
  })

  it('builds a mock payload when mock profile API is enabled', async () => {
    let mutationConfig

    useParamsMock.mockReturnValue({ id: 's-22' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-22' })
    resolveProfileIdMock.mockReturnValue('s-22')
    shouldUseMockProfileApiMock.mockReturnValue(true)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-22' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-22',
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
    useMutationMock.mockImplementation((config) => {
      mutationConfig = config
      return { mutate: vi.fn(), isPending: false, isSuccess: false, isError: false }
    })

    renderPage()

    const result = await mutationConfig.mutationFn({
      name: 'Etu',
      avatarUrl: null,
      description: '',
      faculty: 'Faculte des sciences',
      major: 'Sciences informatiques',
      degreeLevel: 'BACHELOR',
    })

    expect(result.user).toEqual({ name: 'Etu', avatarUrl: null })
    expect(result.student_profile).toEqual({
      faculty: 'Faculte des sciences',
      major: 'Sciences informatiques',
      degreeLevel: 'BACHELOR',
    })
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

  it('opens delete confirmation modal and Annuler closes it', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1', logout: vi.fn() })
    resolveProfileIdMock.mockReturnValue('u-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'u-1',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: { faculty: 'SCI', major: 'INF', degreeLevel: 'BACHELOR' },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    })

    renderPage()

    // Open the modal via the danger zone button
    fireEvent.click(screen.getByRole('button', { name: /Supprimer mon compte/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Text is split across elements — check dialog heading instead
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Close via Annuler inside the modal (first of multiple Annuler buttons)
    fireEvent.click(screen.getAllByRole('button', { name: /^Annuler$/i })[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls deleteAccountMutation.mutate when confirm button is clicked in delete modal', () => {
    const mutateMock = vi.fn()
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1', logout: vi.fn() })
    resolveProfileIdMock.mockReturnValue('u-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'u-1',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: { faculty: 'SCI', major: 'INF', degreeLevel: 'BACHELOR' },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: false,
      isSuccess: false,
    })

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Supprimer mon compte/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Click the confirm delete button inside the dialog
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /Supprimer mon compte/i }))
    expect(mutateMock).toHaveBeenCalledTimes(1)
  })

  it('delete modal shows error message when deleteAccountMutation has failed', () => {
    useParamsMock.mockReturnValue({ id: 'u-1' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1', logout: vi.fn() })
    resolveProfileIdMock.mockReturnValue('u-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'u-1',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: { faculty: 'SCI', major: 'INF', degreeLevel: 'BACHELOR' },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      isSuccess: false,
    })

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Supprimer mon compte/i }))
    expect(screen.getByText(/Impossible de supprimer le compte/i)).toBeInTheDocument()
  })

  it('deleteAccountMutation.mutationFn throws when editableProfileId is "me"', async () => {
    let deleteConfig
    useParamsMock.mockReturnValue({ id: 'me' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-1', logout: vi.fn() })
    resolveProfileIdMock.mockReturnValue('me')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: null })
    normalizeProfileDataMock.mockReturnValue({
      id: null,
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: null,
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockImplementationOnce((config) => {
      deleteConfig = config
      return { mutate: vi.fn(), isPending: false, isError: false, isSuccess: false }
    })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    })

    renderPage()

    // mutationFn may throw synchronously or return a rejected promise
    let caught
    try {
      await deleteConfig.mutationFn()
    } catch (e) {
      caught = e
    }
    expect(caught?.message).toBe('ID utilisateur non résolu. Réessaie dans un instant.')
    expect(deleteUserMock).not.toHaveBeenCalled()
  })

  it('deleteAccountMutation.mutationFn calls deleteUser with the resolved UUID', async () => {
    let deleteConfig
    deleteUserMock.mockResolvedValue(undefined)
    useParamsMock.mockReturnValue({ id: 'u-99' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-99', logout: vi.fn() })
    resolveProfileIdMock.mockReturnValue('u-99')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-99' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'u-99',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: null,
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockImplementationOnce((config) => {
      deleteConfig = config
      return { mutate: vi.fn(), isPending: false, isError: false, isSuccess: false }
    })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    })

    renderPage()

    await deleteConfig.mutationFn()
    expect(deleteUserMock).toHaveBeenCalledWith('u-99')
  })

  it('deleteAccountMutation.onSuccess calls logout when canEditThisProfile is true', () => {
    const logoutMock = vi.fn()
    let deleteConfig
    useParamsMock.mockReturnValue({ id: 'u-88' })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 'u-88', logout: logoutMock })
    resolveProfileIdMock.mockReturnValue('u-88')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 'u-88' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 'u-88',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: null,
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockImplementationOnce((config) => {
      deleteConfig = config
      return { mutate: vi.fn(), isPending: false, isError: false, isSuccess: false }
    })
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
    })

    renderPage()

    // canEditThisProfile = profileId === 'me' || currentUserId === profileId → 'u-88' === 'u-88' → true
    deleteConfig.onSuccess()
    expect(logoutMock).toHaveBeenCalledTimes(1)
  })

  it('revokes previous preview URL when a second avatar file is selected', async () => {
    const mutateMock = vi.fn()
    useParamsMock.mockReturnValue({ id: undefined })
    useNavigateMock.mockReturnValue(vi.fn())
    useAppMock.mockReturnValue({ userRole: 'STUDENT', currentUserId: 's-1', logout: vi.fn() })
    resolveProfileIdMock.mockReturnValue('s-1')
    shouldUseMockProfileApiMock.mockReturnValue(false)
    useQueryMock.mockReturnValue({ isLoading: false, error: null, data: { id: 's-1' } })
    normalizeProfileDataMock.mockReturnValue({
      id: 's-1',
      role: 'STUDENT',
      display_name: 'Etu',
      avatar_url: null,
      student_profile: { faculty: 'SCI', major: 'INF', degreeLevel: 'BACHELOR' },
      association_profile: null,
    })
    useQueryClientMock.mockReturnValue({ setQueryData: vi.fn() })
    useMutationMock.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isError: false,
      isSuccess: false,
    })

    renderPage()

    const avatarInput = screen.getByLabelText(/Avatar \(upload\)/i)
    const fileA = new File(['a'], 'fileA.png', { type: 'image/png' })
    fireEvent.change(avatarInput, { target: { files: [fileA] } })
    expect(URL.createObjectURL).toHaveBeenCalledWith(fileA)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    // Second selection — should revoke the previously set preview URL
    const fileB = new File(['b'], 'fileB.png', { type: 'image/png' })
    fireEvent.change(avatarInput, { target: { files: [fileB] } })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preview-url')
  })
})
