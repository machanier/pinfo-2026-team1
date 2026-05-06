import { afterEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.hoisted(() => vi.fn())
const apiPut = vi.hoisted(() => vi.fn())

vi.mock('./apiClient', () => ({
  default: {
    get: apiGet,
    put: apiPut,
  },
}))

async function loadProfileUtils(profileMockValue = 'false') {
  vi.resetModules()
  vi.stubEnv('VITE_PROFILE_MOCK', profileMockValue)
  return import('./profileUtils')
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('profileUtils', () => {
  it('buildMockProfile returns organizer shape', async () => {
    const { buildMockProfile } = await loadProfileUtils('false')
    const profile = buildMockProfile('ORGANIZER', 'orga-1')

    expect(profile.role).toBe('ORGANIZER')
    expect(profile.id).toBe('orga-1')
    expect(profile.association_profile).toBeTruthy()
    expect(profile.student_profile).toBeNull()
  })

  it('buildMockProfile defaults to student shape', async () => {
    const { buildMockProfile } = await loadProfileUtils('false')
    const profile = buildMockProfile(undefined, 'stu-1')

    expect(profile.role).toBe('STUDENT')
    expect(profile.id).toBe('stu-1')
    expect(profile.student_profile).toBeTruthy()
    expect(profile.association_profile).toBeNull()
  })

  it('formatDate handles empty, invalid and valid values', async () => {
    const { formatDate } = await loadProfileUtils('false')

    expect(formatDate()).toBe('Date inconnue')
    expect(formatDate('not-a-date')).toBe('Date inconnue')
    expect(formatDate('2025-02-10T14:30:00Z')).toMatch(/2025/)
  })

  it('normalizeProfileData applies fallbacks and mapping', async () => {
    const { normalizeProfileData } = await loadProfileUtils('false')

    const normalized = normalizeProfileData(
      {
        id: 'u-1',
        email: 'x@y.z',
        name: 'Nom',
        avatarUrl: 'img',
        createdAt: '2024-01-01T00:00:00Z',
      },
      'student',
    )

    expect(normalized.role).toBe('STUDENT')
    expect(normalized.display_name).toBe('Nom')
    expect(normalized.avatar_url).toBe('img')
    expect(normalized.created_at).toBe('2024-01-01T00:00:00Z')
  })

  it('normalizeProfileData supports snake_case and full fallback defaults', async () => {
    const { normalizeProfileData } = await loadProfileUtils('false')

    const normalized = normalizeProfileData(
      {
        role: 'organizer',
        display_name: 'Nom Public',
        avatar_url: 'avatar-snake.png',
        created_at: '2024-06-01T00:00:00Z',
        studentProfile: { major: 'X' },
        associationProfile: { description: 'Y' },
      },
      null,
    )

    expect(normalized.role).toBe('ORGANIZER')
    expect(normalized.display_name).toBe('Nom Public')
    expect(normalized.avatar_url).toBe('avatar-snake.png')
    expect(normalized.created_at).toBe('2024-06-01T00:00:00Z')

    const fallback = normalizeProfileData({}, undefined)
    expect(fallback.email).toBe('Email non disponible')
    expect(fallback.display_name).toBe('Utilisateur anonyme')
    expect(fallback.id).toBeNull()
  })

  it('resolveProfileId prioritizes route id then current user id', async () => {
    const { resolveProfileId } = await loadProfileUtils('false')

    expect(resolveProfileId('route-1', 'ctx-1')).toBe('route-1')
    expect(resolveProfileId('', '11111111-1111-4111-8111-111111111111')).toBe(
      '11111111-1111-4111-8111-111111111111',
    )
  })

  it('resolveProfileId falls back to dev-self in mock mode when ids are missing', async () => {
    const { resolveProfileId } = await loadProfileUtils('true')

    expect(resolveProfileId('', '')).toBe('dev-self')
  })

  it('shouldUseMockProfileApi returns env-driven value', async () => {
    const modTrue = await loadProfileUtils('true')
    expect(modTrue.shouldUseMockProfileApi()).toBe(true)

    const modFalse = await loadProfileUtils('false')
    expect(modFalse.shouldUseMockProfileApi()).toBe(false)
  })

  it('fetchProfile throws when profileId is missing', async () => {
    const { fetchProfile } = await loadProfileUtils('false')

    await expect(fetchProfile()).rejects.toThrow('ID utilisateur manquant')
  })

  it('fetchProfile returns mock profile when mock mode is enabled', async () => {
    const { fetchProfile } = await loadProfileUtils('true')
    const profile = await fetchProfile('mock-1', 'ORGANIZER')

    expect(profile.id).toBe('mock-1')
    expect(profile.role).toBe('ORGANIZER')
    expect(apiGet).not.toHaveBeenCalled()
  })

  it('fetchProfile resolves organizer profile with association data', async () => {
    const { fetchProfile } = await loadProfileUtils('false')
    apiGet
      .mockResolvedValueOnce({ data: { id: 'o-1', role: 'ORGANIZER' } })
      .mockResolvedValueOnce({ data: { description: 'Asso test' } })

    const profile = await fetchProfile('o-1', 'ORGANIZER')

    expect(apiGet).toHaveBeenNthCalledWith(1, '/api/users/o-1')
    expect(apiGet).toHaveBeenNthCalledWith(2, '/api/users/o-1/association-profile')
    expect(profile.association_profile).toEqual({ description: 'Asso test' })
    expect(profile.student_profile).toBeNull()
  })

  it('fetchProfile handles 404 on organizer association profile', async () => {
    const { fetchProfile } = await loadProfileUtils('false')
    apiGet
      .mockResolvedValueOnce({ data: { id: 'o-2', role: 'ORGANIZER' } })
      .mockRejectedValueOnce({ response: { status: 404 } })

    const profile = await fetchProfile('o-2', 'ORGANIZER')

    expect(profile.association_profile).toBeNull()
    expect(profile.student_profile).toBeNull()
  })

  it('fetchProfile rethrows non-404 on organizer association profile', async () => {
    const { fetchProfile } = await loadProfileUtils('false')
    apiGet
      .mockResolvedValueOnce({ data: { id: 'o-3', role: 'ORGANIZER' } })
      .mockRejectedValueOnce({ response: { status: 500 } })

    await expect(fetchProfile('o-3', 'ORGANIZER')).rejects.toEqual({
      response: { status: 500 },
    })
  })

  it('fetchProfile resolves student profile data', async () => {
    const { fetchProfile } = await loadProfileUtils('false')
    apiGet
      .mockResolvedValueOnce({ data: { id: 's-1', role: 'STUDENT' } })
      .mockResolvedValueOnce({ data: { faculty: 'Informatique' } })

    const profile = await fetchProfile('s-1', 'STUDENT')

    expect(apiGet).toHaveBeenNthCalledWith(1, '/api/users/s-1')
    expect(apiGet).toHaveBeenNthCalledWith(2, '/api/users/s-1/student-profile')
    expect(profile.student_profile).toEqual({ faculty: 'Informatique' })
    expect(profile.association_profile).toBeNull()
  })

  it('fetchProfile handles 404 on student profile', async () => {
    const { fetchProfile } = await loadProfileUtils('false')
    apiGet
      .mockResolvedValueOnce({ data: { id: 's-2', role: 'STUDENT' } })
      .mockRejectedValueOnce({ response: { status: 404 } })

    const profile = await fetchProfile('s-2', 'STUDENT')

    expect(profile.student_profile).toBeNull()
    expect(profile.association_profile).toBeNull()
  })

  it('fetchProfile rethrows non-404 on student profile', async () => {
    const { fetchProfile } = await loadProfileUtils('false')
    apiGet
      .mockResolvedValueOnce({ data: { id: 's-3', role: 'STUDENT' } })
      .mockRejectedValueOnce({ response: { status: 503 } })

    await expect(fetchProfile('s-3', 'STUDENT')).rejects.toEqual({
      response: { status: 503 },
    })
  })

  it('updateProfile throws when userId is missing', async () => {
    const { updateProfile } = await loadProfileUtils('false')

    await expect(updateProfile()).rejects.toThrow('ID utilisateur manquant')
  })

  it('updateProfile returns mock payload in mock mode', async () => {
    const { updateProfile } = await loadProfileUtils('true')

    const updated = await updateProfile('u-1', {
      display_name: 'Nouveau nom',
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
    })

    expect(updated).toEqual({
      id: 'u-1',
      name: 'Nouveau nom',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
    })
    expect(apiPut).not.toHaveBeenCalled()
  })

  it('updateProfile maps fields and sends API payload', async () => {
    const { updateProfile } = await loadProfileUtils('false')
    apiPut.mockResolvedValueOnce({ data: { id: 'u-2', name: 'Nom API', avatarUrl: null } })

    const updated = await updateProfile('u-2', {
      display_name: 'Nom local',
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/x.png',
    })

    expect(apiPut).toHaveBeenCalledWith('/api/users/u-2', {
      name: 'Nom local',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/x.png',
    })
    expect(updated).toEqual({ id: 'u-2', name: 'Nom API', avatarUrl: null })
  })

  it('updateProfile keeps explicit name/avatarUrl and strips transient aliases', async () => {
    const { updateProfile } = await loadProfileUtils('false')
    apiPut.mockResolvedValueOnce({ data: { id: 'u-9', name: 'N', avatarUrl: 'a' } })

    await updateProfile('u-9', {
      name: 'Nom explicite',
      display_name: 'Nom alternatif',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatar-explicite.png',
      avatar_url: 'avatar-alias',
    })

    expect(apiPut).toHaveBeenCalledWith('/api/users/u-9', {
      name: 'Nom explicite',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatar-explicite.png',
    })
  })

  it('updateProfile throws mapped API message on failure', async () => {
    const { updateProfile } = await loadProfileUtils('false')
    apiPut.mockRejectedValueOnce({
      response: { data: { message: 'Erreur API explicite' } },
    })

    await expect(updateProfile('u-3', { name: 'X' })).rejects.toThrow('Erreur API explicite')
  })

  it('updateProfile uses error fallback then default fallback message', async () => {
    const { updateProfile } = await loadProfileUtils('false')
    apiPut.mockRejectedValueOnce({
      response: { data: { error: 'Erreur secondaire' } },
    })

    await expect(updateProfile('u-4', { name: 'X' })).rejects.toThrow('Erreur secondaire')

    apiPut.mockRejectedValueOnce({ response: { data: {} } })
    await expect(updateProfile('u-5', { name: 'X' })).rejects.toThrow(
      'Impossible de mettre a jour le profil.',
    )
  })
})
