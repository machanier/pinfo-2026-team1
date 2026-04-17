import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../contexts/useApp'
import Button from '../components/ui/button'
import api from '../lib/apiClient'
import {
  fetchProfile,
  fileToDataUrl,
  mockModeEnabled,
  normalizeProfileData,
  resolveProfileId,
  updateProfile,
} from '../lib/profileUtils'

const FACULTY_OPTIONS = [
  'GSEM',
  'Sciences',
  'Lettres et Sciences Humaines',
  'Droit',
  'Economie',
  'Faculte de Medecine',
]
const MAJOR_OPTIONS = [
  'SINF',
  'Computer Science',
  'Mathematiques',
  'Physique',
  'Chimie',
  'Biologie',
  'Droit Public',
  'Droit Prive',
  'Economie Appliquee',
  'Economie Theorique',
  'Medecine Generale',
  'Medecine Specialisee',
]

function buildSelectOptions(options, currentValue) {
  const normalizedCurrent = String(currentValue || '').trim()

  if (!normalizedCurrent || options.includes(normalizedCurrent)) {
    return options
  }

  return [normalizedCurrent, ...options]
}

export default function EditProfilePage() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userRole, currentUserId } = useApp()
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')

  const profileId = resolveProfileId(routeId, currentUserId)
  const canEditThisProfile = !routeId || !currentUserId || routeId === currentUserId

  const profileQuery = useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => fetchProfile(profileId, userRole),
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
  const studentProfile = normalizedProfile.student_profile
  const associationProfile = normalizedProfile.association_profile
  const facultyOptions = buildSelectOptions(FACULTY_OPTIONS, studentProfile?.faculty)
  const majorOptions = buildSelectOptions(MAJOR_OPTIONS, studentProfile?.major)

  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, avatarUrl, description, faculty, major, degreeLevel }) => {
      if (!profileId) {
        throw new Error('ID utilisateur manquant')
      }

      const payload = {
        name,
        avatarUrl: avatarUrl || null,
      }

      if (mockModeEnabled) {
        return {
          user: payload,
          association_profile: isOrganizer
            ? {
                ...(associationProfile || {}),
                description: description || associationProfile?.description || null,
              }
            : null,
          student_profile: !isOrganizer
            ? {
                ...(studentProfile || {}),
                faculty: faculty || studentProfile?.faculty || null,
                major: major || studentProfile?.major || null,
                degreeLevel: degreeLevel || studentProfile?.degreeLevel || null,
              }
            : null,
        }
      }

      const updatedUser = await updateProfile(profileId, payload)

      let updatedAssociationProfile = null
      let updatedStudentProfile = null

      if (isOrganizer) {
        const associationResponse = await api.put(`/api/users/${profileId}/association-profile`, {
          description: description || associationProfile?.description || '',
        })
        updatedAssociationProfile = associationResponse.data
      } else {
        const studentResponse = await api.put(`/api/users/${profileId}/student-profile`, {
          faculty: faculty || studentProfile?.faculty || '',
          major: major || studentProfile?.major || '',
          degreeLevel: degreeLevel || studentProfile?.degreeLevel || 'BACHELOR',
        })
        updatedStudentProfile = studentResponse.data
      }

      return {
        user: updatedUser,
        association_profile: updatedAssociationProfile,
        student_profile: updatedStudentProfile,
      }
    },
    onSuccess: (updatedData, variables) => {
      queryClient.setQueryData(['profile', profileId], (previousData) => {
        if (!previousData) {
          return previousData
        }

        return {
          ...previousData,
          name: updatedData?.user?.name ?? variables?.name,
          avatarUrl: updatedData?.user?.avatarUrl ?? (variables?.avatarUrl || null),
          association_profile:
            updatedData?.association_profile || previousData?.association_profile || null,
          student_profile: updatedData?.student_profile || previousData?.student_profile || null,
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

    if (!profileId || !canEditThisProfile) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const submittedName = String(formData.get('profileName') || '').trim()
    const submittedDescription = String(formData.get('profileDescription') || '').trim()
    const submittedFaculty = String(formData.get('profileFaculty') || '').trim()
    const submittedMajor = String(formData.get('profileMajor') || '').trim()
    const submittedDegreeLevel = String(formData.get('profileDegreeLevel') || '').trim()

    updateProfileMutation.mutate({
      name: submittedName || normalizedProfile.display_name,
      avatarUrl: selectedAvatarUrl || normalizedProfile.avatar_url || null,
      description: submittedDescription,
      faculty: submittedFaculty,
      major: submittedMajor,
      degreeLevel: submittedDegreeLevel,
    })
  }

  if (!profileId) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Impossible d'identifier l'utilisateur courant.
        </div>
      </div>
    )
  }

  if (!canEditThisProfile) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          Tu ne peux modifier que ton propre profil.
        </div>
        <Link to="/profile" className="text-sm font-medium text-indigo-700 hover:underline">
          Retour a mon profil
        </Link>
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

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Editer mon profil</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {(mockModeEnabled || import.meta.env.DEV) && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Mode mock actif: profil simulé charge sans appel API backend.
          </div>
        )}

        <form
          key={normalizedProfile.id || 'profile-edit-form'}
          className="space-y-4"
          onSubmit={handleSaveProfile}
        >
          <div>
            <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-gray-700">
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

          {isOrganizer && (
            <div>
              <label
                htmlFor="profile-description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="profile-description"
                name="profileDescription"
                rows={4}
                defaultValue={associationProfile?.description || ''}
                placeholder="Description de votre organisation"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {!isOrganizer && (
            <>
              <div>
                <label
                  htmlFor="profile-faculty"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Faculte
                </label>
                <select
                  id="profile-faculty"
                  name="profileFaculty"
                  defaultValue={studentProfile?.faculty || ''}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Selectionner une faculte
                  </option>
                  {facultyOptions.map((faculty) => (
                    <option key={faculty} value={faculty}>
                      {faculty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-major"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Majeure
                </label>
                <select
                  id="profile-major"
                  name="profileMajor"
                  defaultValue={studentProfile?.major || ''}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Selectionner une majeure
                  </option>
                  {majorOptions.map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-degree-level"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Niveau
                </label>
                <select
                  id="profile-degree-level"
                  name="profileDegreeLevel"
                  defaultValue={studentProfile?.degreeLevel || 'BACHELOR'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="BACHELOR">Bachelor</option>
                  <option value="MASTER">Master</option>
                  <option value="PHD">PhD</option>
                </select>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="submit"
              className="bg-indigo-600 hover:opacity-95"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer le profil'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/profile')}>
              Annuler
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
    </div>
  )
}
