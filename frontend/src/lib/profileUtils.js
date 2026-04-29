import api from './apiClient'

export const mockModeEnabled =
  String(import.meta.env.VITE_PROFILE_MOCK || '').toLowerCase() === 'true'

export function shouldUseMockProfileApi() {
  return mockModeEnabled
}

export function buildMockProfile(role, profileId) {
  const normalizedRole = (role || 'STUDENT').toUpperCase()

  if (normalizedRole === 'ORGANIZER') {
    return {
      id: profileId,
      email: 'organizer@unigevents.local',
      role: 'ORGANIZER',
      name: 'Association Campus',
      avatarUrl: null,
      createdAt: '2024-09-15T09:00:00Z',
      association_profile: {
        userId: profileId,
        description: 'Association etudiante active sur la vie du campus.',
        logoUrl: null,
      },
      student_profile: null,
    }
  }

  return {
    id: profileId,
    email: 'student@unigevents.local',
    role: 'STUDENT',
    name: 'Etudiant Demo',
    avatarUrl: null,
    createdAt: '2025-02-10T14:30:00Z',
    association_profile: null,
    student_profile: {
      userId: profileId,
      faculty: 'Informatique',
      major: 'Informatique',
      degreeLevel: 'BACHELOR',
    },
  }
}

export function formatDate(dateValue) {
  if (!dateValue) {
    return 'Date inconnue'
  }

  const parsed = new Date(dateValue)

  if (Number.isNaN(parsed.getTime())) {
    return 'Date inconnue'
  }

  return new Intl.DateTimeFormat('fr-CH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed)
}

export function normalizeProfileData(data, fallbackRole) {
  const role = (data?.role || fallbackRole || 'STUDENT').toUpperCase()

  return {
    id: data?.id ?? null,
    email: data?.email ?? 'Email non disponible',
    role,
    display_name: data?.display_name || data?.name || 'Utilisateur anonyme',
    avatar_url: data?.avatar_url || data?.avatarUrl || null,
    created_at: data?.created_at || data?.createdAt || null,
    student_profile: data?.student_profile || data?.studentProfile || null,
    association_profile: data?.association_profile || data?.associationProfile || null,
  }
}

export function resolveProfileId(routeId, currentUserId) {
  return routeId || currentUserId || (mockModeEnabled ? 'dev-self' : null)
}

export async function fetchProfile(profileId, userRole) {
  if (!profileId) {
    throw new Error('ID utilisateur manquant')
  }

  if (shouldUseMockProfileApi(profileId)) {
    return buildMockProfile(userRole, profileId)
  }

  const profile = await api.get(`/api/users/${profileId}`)
  const baseProfile = profile.data || {}
  const resolvedRole = String(baseProfile.role || userRole || 'STUDENT').toUpperCase()

  if (resolvedRole === 'ORGANIZER') {
    try {
      const associationResponse = await api.get(`/api/users/${profileId}/association-profile`)
      return {
        ...baseProfile,
        association_profile: associationResponse.data,
        student_profile: null,
      }
    } catch (error) {
      if (error?.response?.status !== 404) {
        throw error
      }
      return {
        ...baseProfile,
        association_profile: null,
        student_profile: null,
      }
    }
  }

  try {
    const studentResponse = await api.get(`/api/users/${profileId}/student-profile`)
    return {
      ...baseProfile,
      student_profile: studentResponse.data,
      association_profile: null,
    }
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error
    }
    return {
      ...baseProfile,
      student_profile: null,
      association_profile: null,
    }
  }
}

export async function updateProfile(userId, profileData) {
  if (!userId) {
    throw new Error('ID utilisateur manquant')
  }

  const safeData = profileData || {}
  const payload = {
    ...safeData,
    name: safeData.name ?? safeData.display_name,
    avatarUrl: safeData.avatarUrl ?? safeData.avatar_url ?? null,
  }

  delete payload.display_name
  delete payload.avatar_url

  if (shouldUseMockProfileApi(userId)) {
    return {
      id: userId,
      name: payload.name || 'Utilisateur anonyme',
      avatarUrl: payload.avatarUrl || null,
    }
  }

  try {
    const response = await api.put(`/api/users/${userId}`, payload)
    return response.data
  } catch (error) {
    const apiMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      'Impossible de mettre a jour le profil.'

    throw new Error(apiMessage, { cause: error })
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'))
    reader.readAsDataURL(file)
  })
}
