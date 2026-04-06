import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useApp } from '../contexts/useApp'
import Badge from '../components/ui/badge'
import Button from '../components/ui/button'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

const mockModeEnabled = String(import.meta.env.VITE_PROFILE_MOCK || '').toLowerCase() === 'true'

function buildMockProfile(role, profileId) {
  const normalizedRole = (role || 'STUDENT').toUpperCase()

  if (normalizedRole === 'ORGANIZER') {
    return {
      id: profileId,
      email: 'organizer@unigevents.local',
      role: 'ORGANIZER',
      display_name: 'Association Campus',
      avatar_url: null,
      created_at: '2024-09-15T09:00:00Z',
      organizer_profile: {
        bio: 'Association etudiante active sur la vie du campus.',
        association_name: 'Association Campus',
        website: 'https://unigevents.local/association',
        verified: true,
        follower_count: 128,
      },
      student_profile: null,
    }
  }

  return {
    id: profileId,
    email: 'student@unigevents.local',
    role: 'STUDENT',
    display_name: 'Etudiant Demo',
    avatar_url: null,
    created_at: '2025-02-10T14:30:00Z',
    organizer_profile: null,
    student_profile: {
      university_id: 'UNIGE',
      department: 'Informatique',
      year_of_study: '3',
    },
  }
}

function formatDate(dateValue) {
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

function normalizeProfileData(data, fallbackRole) {
  const role = (data?.role || fallbackRole || 'STUDENT').toUpperCase()

  return {
    id: data?.id ?? null,
    email: data?.email ?? 'Email non disponible',
    role,
    display_name: data?.display_name || 'Utilisateur anonyme',
    avatar_url: data?.avatar_url || null,
    created_at: data?.created_at || null,
    student_profile: data?.student_profile || data?.student_profiles || null,
    organizer_profile: data?.organizer_profile || data?.organizer_profiles || null,
  }
}

export default function ProfilePage() {
  const { id: routeId } = useParams()
  const queryClient = useQueryClient()
  const { userRole, savedEvents = [] } = useApp()

  const profileId = routeId || 'me'

  const profileQuery = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      if (mockModeEnabled) {
        return buildMockProfile(userRole, profileId)
      }

      try {
        const primary = await api.get(`/api/users/${profileId}/profile`)
        return primary.data
      } catch (error) {
        // Fallback mock in local development when backend is down.
        if (import.meta.env.DEV) {
          return buildMockProfile(userRole, profileId)
        }
        throw error
      }
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) {
        return false
      }
      return failureCount < 2
    },
  })

  const normalizedProfile = normalizeProfileData(profileQuery.data, userRole)
  const isOrganizer = normalizedProfile.role === 'ORGANIZER'

  const organizerFallbackQuery = useQuery({
    queryKey: ['organizer-profile', profileId],
    queryFn: async () => {
      const response = await api.get(`/api/organizers/${profileId}`)
      return response.data
    },
    enabled: !!profileQuery.error && isOrganizer,
    retry: false,
  })

  const organizerProfile =
    normalizedProfile.organizer_profile || organizerFallbackQuery.data?.organizer_profile || null

  const followMutation = useMutation({
    mutationFn: async () => {
      if (mockModeEnabled || import.meta.env.DEV) {
        return
      }
      await api.post(`/api/organizers/${profileId}/follow`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', profileId] })
      queryClient.invalidateQueries({ queryKey: ['organizer-profile', profileId] })
    },
  })

  if (profileQuery.isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
          Chargement du profil...
        </div>
      </div>
    )
  }

  if (profileQuery.error && !organizerFallbackQuery.data) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          Impossible de charger le profil. Verifie la disponibilite de l'API.
        </div>
      </div>
    )
  }

  const studentProfile = normalizedProfile.student_profile
  const fallbackBio =
    "En charge de la creation et de la gestion d'evenements associatifs et universitaires."

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil Utilisateur</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* En-tête avec couverture*/}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

        <div className="px-6 pb-6">
          {(mockModeEnabled || import.meta.env.DEV) && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Mode mock actif: profil simulé charge sans appel API backend.
            </div>
          )}

          {/* Avatar superposé */}
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg">
              {normalizedProfile.avatar_url ? (
                <img
                  src={normalizedProfile.avatar_url}
                  alt="Avatar utilisateur"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 text-3xl font-bold">
                  {normalizedProfile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Informations Publiques */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{normalizedProfile.display_name}</h2>
            <div className="mt-2">
              <Badge variant={isOrganizer ? 'default' : 'secondary'}>
                {isOrganizer ? 'Organisateur' : 'Etudiant'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-600">{normalizedProfile.email}</p>
            <p className="mt-1 text-xs text-gray-500">
              Membre depuis le {formatDate(normalizedProfile.created_at)}
            </p>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">À propos</h3>
            <p className="text-gray-600 leading-relaxed">
              Membre de l'application UNIGEvents. {organizerProfile?.bio || fallbackBio}
            </p>
          </div>

          {isOrganizer && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Organisation</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="text-gray-500">Association: </span>
                  {organizerProfile?.association_name || 'Non renseignee'}
                </p>
                <p>
                  <span className="text-gray-500">Site web: </span>
                  {organizerProfile?.website || 'Non renseigne'}
                </p>
                <p>
                  <span className="text-gray-500">Verification: </span>
                  {organizerProfile?.verified ? 'Verifie' : 'Non verifie'}
                </p>
                <p>
                  <span className="text-gray-500">Followers: </span>
                  {organizerProfile?.follower_count ?? 0}
                </p>
              </div>
              <div className="mt-4">
                <Button
                  className="bg-indigo-600 hover:opacity-95"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending ? 'Abonnement...' : "S'abonner"}
                </Button>
                {followMutation.isError && (
                  <p className="mt-2 text-sm text-red-600">
                    Impossible de s'abonner pour le moment.
                  </p>
                )}
                {followMutation.isSuccess && (
                  <p className="mt-2 text-sm text-green-700">Abonnement effectue.</p>
                )}
              </div>
            </div>
          )}

          {!isOrganizer && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Profil etudiant</h3>
              <p className="text-sm text-gray-600 mb-4">
                Informations académiques visibles sur ton profil public.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Universite</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {studentProfile?.university_id || 'Non renseignee'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Departement</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {studentProfile?.department || 'Non renseigne'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Annee</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {studentProfile?.year_of_study || 'Non renseignee'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Activite</h3>
            <p className="text-gray-600 text-sm">Evenements sauvegardes: {savedEvents.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
