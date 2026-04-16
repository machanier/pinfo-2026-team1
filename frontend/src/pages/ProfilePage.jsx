import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useApp } from '../contexts/useApp'
import Badge from '../components/ui/badge'
import Button from '../components/ui/button'
import api from '../lib/apiClient'

const mockModeEnabled = String(import.meta.env.VITE_PROFILE_MOCK || '').toLowerCase() === 'true'

function buildMockProfile(role, profileId) {
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
    display_name: data?.display_name || data?.name || 'Utilisateur anonyme',
    avatar_url: data?.avatar_url || data?.avatarUrl || null,
    created_at: data?.created_at || data?.createdAt || null,
    student_profile: data?.student_profile || data?.studentProfile || null,
    association_profile: data?.association_profile || data?.associationProfile || null,
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'))
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage() {
  const { id: routeId } = useParams()
  const queryClient = useQueryClient()
  const { userRole, savedEvents = [], currentUserId } = useApp()
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')

  const profileId =
    routeId || currentUserId || (mockModeEnabled || import.meta.env.DEV ? 'dev-self' : null)

  const profileQuery = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
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
    },
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) {
        return false
      }
      return failureCount < 2
    },
    enabled: Boolean(profileId),
  })

  const normalizedProfile = normalizeProfileData(profileQuery.data, userRole)
  const isOrganizer = normalizedProfile.role === 'ORGANIZER'
  const associationProfile = normalizedProfile.association_profile

  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, avatarUrl }) => {
      if (!profileId) {
        throw new Error('ID utilisateur manquant')
      }

      const payload = {
        name,
        avatarUrl: avatarUrl || null,
      }

      if (mockModeEnabled) {
        return payload
      }

      const response = await api.put(`/api/users/${profileId}`, payload)
      return response.data
    },
    onSuccess: (updatedData, variables) => {
      queryClient.setQueryData(['profile', profileId], (previousData) => {
        if (!previousData) {
          return previousData
        }

        return {
          ...previousData,
          name: updatedData?.name ?? variables?.name,
          avatarUrl: updatedData?.avatarUrl ?? (variables?.avatarUrl || null),
        }
      })
      setSelectedAvatarUrl('')
    },
  })

  async function handleAvatarChange(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    try {
      const dataUrl = await fileToDataUrl(selectedFile)
      setSelectedAvatarUrl(dataUrl)
    } catch {
      setSelectedAvatarUrl('')
    }
  }

  function handleSaveProfile(event) {
    event.preventDefault()

    if (!profileId) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const submittedName = String(formData.get('profileName') || '').trim()

    updateProfileMutation.mutate({
      name: submittedName || normalizedProfile.display_name,
      avatarUrl: selectedAvatarUrl || normalizedProfile.avatar_url || null,
    })
  }

  if (!profileId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Impossible d'identifier l'utilisateur courant. Fournis un userId via le contexte
          d'authentification ou ouvre la route /profile/:id.
        </div>
      </div>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
          Chargement du profil...
        </div>
      </div>
    )
  }

  if (profileQuery.error) {
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
              {selectedAvatarUrl || normalizedProfile.avatar_url ? (
                <img
                  src={selectedAvatarUrl || normalizedProfile.avatar_url}
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Modifier le profil</h3>
            <form key={normalizedProfile.id || 'profile-form'} className="space-y-4" onSubmit={handleSaveProfile}>
              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Nom affiche
                </label>
                <input
                  id="profile-name"
                  name="profileName"
                  type="text"
                  defaultValue={normalizedProfile.display_name}
                  placeholder="Ton nom public"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-avatar"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Avatar (upload)
                </label>
                <input
                  id="profile-avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:opacity-95"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer le profil'}
                </Button>
                {updateProfileMutation.isSuccess && (
                  <p className="text-sm text-green-700">Profil mis a jour.</p>
                )}
                {updateProfileMutation.isError && (
                  <p className="text-sm text-red-600">Impossible de sauvegarder le profil.</p>
                )}
              </div>
            </form>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">À propos</h3>
            <p className="text-gray-600 leading-relaxed">
              Membre de l'application UNIGEvents. {associationProfile?.description || fallbackBio}
            </p>
          </div>

          {isOrganizer && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Organisation</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="text-gray-500">Nom: </span>
                  {normalizedProfile.display_name || 'Non renseigne'}
                </p>
                <p>
                  <span className="text-gray-500">Description: </span>
                  {associationProfile?.description || 'Non renseignee'}
                </p>
                <p>
                  <span className="text-gray-500">Logo: </span>
                  {associationProfile?.logoUrl ? (
                    <a
                      href={associationProfile.logoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Voir le logo
                    </a>
                  ) : (
                    'Non renseigne'
                  )}
                </p>
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
                  <p className="text-xs uppercase tracking-wide text-gray-500">Faculte</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {studentProfile?.faculty || 'Non renseignee'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Majeure</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {studentProfile?.major || 'Non renseignee'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Niveau</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {studentProfile?.degreeLevel || 'Non renseigne'}
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
