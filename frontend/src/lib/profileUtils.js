import api from './apiClient'

export const mockModeEnabled =
  String(import.meta.env.VITE_PROFILE_MOCK || '').toLowerCase() === 'true'

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
  return routeId || currentUserId || (mockModeEnabled || import.meta.env.DEV ? 'dev-self' : null)
}

export async function fetchProfile(profileId, userRole) {
  if (!profileId) {
    throw new Error('ID utilisateur manquant')
  }

  if (mockModeEnabled) {
    return buildMockProfile(userRole, profileId)
  }

  try {
    const primary = await api.get(`/api/users/${profileId}`)
    const normalizedRole = String(primary?.data?.role || userRole || '').toUpperCase()

    if (normalizedRole === 'ORGANIZER') {
      const association = await api.get(`/api/users/${profileId}/association-profile`)
      return {
        ...primary.data,
        association_profile: association.data,
      }
    }

    if (normalizedRole === 'STUDENT') {
      const student = await api.get(`/api/users/${profileId}/student-profile`)
      return {
        ...primary.data,
        student_profile: student.data,
      }
    }

    return primary.data
  } catch (error) {
    // Fallback mock in local development when backend is down.
    if (import.meta.env.DEV) {
      return buildMockProfile(userRole, profileId)
    }
    throw error
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
