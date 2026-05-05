import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../contexts/useApp'
import api from '../lib/apiClient'
import Button from '../components/ui/button'
import {
  fetchProfile,
  normalizeProfileData,
  resolveProfileId,
  shouldUseMockProfileApi,
  updateProfile,
} from '../lib/profileUtils'

const FACULTY_OPTIONS = [
  'Faculte des sciences',
  'Faculte de medecine',
  'Faculte des lettres',
  'Faculte des sciences de la societe (SdS)',
  "Faculte d'economie et de management (GSEM)",
  'Faculte de droit',
  'Faculte de theologie',
  "Faculte de psychologie et des sciences de l'education (FPSE)",
  "Faculte de traduction et d'interpretation (FTI)",
  'Global Studies Institute (GSI)',
  "Centre universitaire d'informatique (CUI)",
  "Institut des sciences de l'environnement (ISE)",
  'Institut universitaire de formation des enseignants (IUFE)',
]

const PROGRAM_OPTIONS_BY_FACULTY = {
  'Faculte des sciences': [
    'Mathematiques',
    'Sciences informatiques',
    'Physique',
    'Chimie et Biochimie',
    'Biologie',
    "Sciences de la Terre et de l'environnement",
    'Sciences pharmaceutiques',
  ],
  'Faculte de medecine': [
    'Medecine humaine',
    'Medecine dentaire',
    'Sciences du mouvement et du sport (Education physique)',
  ],
  "Faculte d'economie et de management (GSEM)": [
    "Management / Gestion d'entreprise",
    'Economie',
    'Finance',
    'Statistique',
    'Science des donnees (Data Science)',
  ],
  'Faculte de droit': ['Droit suisse', 'Droit international et europeen', 'Droit economique'],
  'Faculte des sciences de la societe (SdS)': [
    'Science politique',
    'Sociologie',
    'Geographie et environnement',
    'Histoire, economie et societe',
    'Etudes genre',
  ],
  'Global Studies Institute (GSI)': ['Relations internationales', 'Etudes europeennes'],
  "Faculte de psychologie et des sciences de l'education (FPSE)": [
    'Psychologie',
    "Sciences de l'education",
    'Logopedie',
  ],
  'Faculte des lettres': [
    'Langues et litteratures',
    'Histoire',
    "Histoire de l'art",
    'Philosophie',
    "Sciences de l'Antiquite",
    'Archeologie',
  ],
  "Faculte de traduction et d'interpretation (FTI)": [
    'Traduction',
    'Interpretation de conference',
    'Technologies de la traduction / Communication multilingue',
  ],
  'Faculte de theologie': ['Theologie protestante'],
  "Centre universitaire d'informatique (CUI)": ['Sciences informatiques'],
  "Institut des sciences de l'environnement (ISE)": ["Sciences de la Terre et de l'environnement"],
  'Institut universitaire de formation des enseignants (IUFE)': ['Formation des enseignants'],
}

function buildSelectOptions(options, currentValue) {
  const normalizedCurrent = String(currentValue || '').trim()

  if (!normalizedCurrent || options.includes(normalizedCurrent)) {
    return options
  }

  return [normalizedCurrent, ...options]
}

async function uploadAvatarToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('Configuration Cloudinary manquante. Renseigne VITE_CLOUDINARY_*.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    const message = errorPayload?.error?.message || 'Upload Cloudinary echoue.'
    throw new Error(message)
  }

  const payload = await response.json()
  if (!payload?.secure_url) {
    throw new Error('Aucune URL retournee par Cloudinary.')
  }

  return payload.secure_url
}

export default function EditProfilePage() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { userRole, currentUserId } = useApp()
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')
  const [avatarUploadError, setAvatarUploadError] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  // File staged for upload — only sent to Cloudinary when the form is saved
  // to avoid creating orphaned assets on cancellation or repeated picks.
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null)
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [selectedMajor, setSelectedMajor] = useState('')

  // Revoke the object URL when the preview changes or on unmount.
  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview)
      }
    }
  }, [pendingAvatarPreview])

  const profileId = resolveProfileId(routeId, currentUserId)
  // Permission should be evaluated against the resolved profile id (the real target)
  const canEditThisProfile = Boolean(currentUserId) && profileId === currentUserId
  const useMockProfileApi = shouldUseMockProfileApi(profileId)

  const profileQuery = useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => fetchProfile(profileId, userRole),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60_000,
    enabled: Boolean(profileId),
  })

  const normalizedProfile = normalizeProfileData(profileQuery.data, userRole)
  const editableProfileId = normalizedProfile.id || profileId
  const profileRole = normalizedProfile.role
  const isOrganizer = profileRole === 'ORGANIZER'
  const isStudent = profileRole === 'STUDENT'
  const studentProfile = normalizedProfile.student_profile
  const associationProfile = normalizedProfile.association_profile
  const effectiveFaculty = selectedFaculty || studentProfile?.faculty || ''
  const effectiveMajor = selectedMajor || studentProfile?.major || ''
  const selectedFacultyPrograms = PROGRAM_OPTIONS_BY_FACULTY[effectiveFaculty] || []
  const facultyOptions = buildSelectOptions(FACULTY_OPTIONS, studentProfile?.faculty)
  const majorOptions = buildSelectOptions(selectedFacultyPrograms, studentProfile?.major)
  const effectiveMajorValue = majorOptions.includes(effectiveMajor) ? effectiveMajor : ''

  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, avatarUrl, description, faculty, major, degreeLevel }) => {
      if (!profileId) {
        throw new Error('ID utilisateur manquant')
      }

      const payload = {
        name,
        avatarUrl: avatarUrl || null,
      }

      if (useMockProfileApi) {
        return {
          user: payload,
          association_profile: isOrganizer
            ? {
                ...(associationProfile || {}),
                description: description || associationProfile?.description || null,
              }
            : null,
          student_profile: isStudent
            ? {
                ...(studentProfile || {}),
                faculty: faculty || studentProfile?.faculty || null,
                major: major || studentProfile?.major || null,
                degreeLevel: degreeLevel || studentProfile?.degreeLevel || null,
              }
            : null,
        }
      }

      const updatedUser = await updateProfile(editableProfileId, payload)

      let updatedAssociationProfile = null
      let updatedStudentProfile = null

      if (isOrganizer) {
        try {
          const associationResponse = await api.put(
            `/api/users/${editableProfileId}/association-profile`,
            {
              description: description || associationProfile?.description || '',
            },
          )
          updatedAssociationProfile = associationResponse.data
        } catch (error) {
          if (error?.response?.status !== 404) {
            throw error
          }
        }
      } else if (isStudent) {
        try {
          const studentResponse = await api.put(`/api/users/${editableProfileId}/student-profile`, {
            faculty: faculty || studentProfile?.faculty || '',
            major: major || studentProfile?.major || '',
            degreeLevel: degreeLevel || studentProfile?.degreeLevel || 'BACHELOR',
          })
          updatedStudentProfile = studentResponse.data
        } catch (error) {
          if (error?.response?.status !== 404) {
            throw error
          }
        }
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
            updatedData?.association_profile !== undefined
              ? updatedData.association_profile
              : (previousData?.association_profile ?? null),
          student_profile:
            updatedData?.student_profile !== undefined
              ? updatedData.student_profile
              : (previousData?.student_profile ?? null),
        }
      })
      setSelectedAvatarUrl('')
      setAvatarUploadError('')
      setPendingAvatarFile(null)
      setPendingAvatarPreview(null)
      navigate('/profile')
    },
  })

  function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // Revoke any previous preview to free memory
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview)
    }

    setAvatarUploadError('')
    setSelectedAvatarUrl('') // clear any previously uploaded URL
    setPendingAvatarFile(file)
    setPendingAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile(event) {
    event.preventDefault()

    if (!profileId || !canEditThisProfile) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const submittedName = String(formData.get('profileName') || '').trim()
    const submittedDescription = String(formData.get('profileDescription') || '').trim()
    const submittedFaculty = String(formData.get('profileFaculty') || effectiveFaculty || '').trim()
    const submittedMajor = String(formData.get('profileMajor') || effectiveMajorValue || '').trim()
    const submittedDegreeLevel = String(formData.get('profileDegreeLevel') || '').trim()

    // Upload to Cloudinary only now, at save time, to avoid orphaned assets.
    // If the user did not pick a new file, send null so the backend keeps
    // whatever URL is already stored (the backend only updates avatarUrl when
    // the value is non-null — see UserResource.apiUsersUserIdPut).
    let resolvedAvatarUrl = selectedAvatarUrl || null
    if (pendingAvatarFile) {
      try {
        setIsUploadingAvatar(true)
        setAvatarUploadError('')
        resolvedAvatarUrl = await uploadAvatarToCloudinary(pendingAvatarFile)
        setSelectedAvatarUrl(resolvedAvatarUrl)
        setPendingAvatarFile(null)
      } catch (error) {
        setAvatarUploadError(error?.message || 'Upload avatar echoue. Reessaie.')
        setIsUploadingAvatar(false)
        return
      } finally {
        setIsUploadingAvatar(false)
      }
    }

    updateProfileMutation.mutate({
      name: submittedName || normalizedProfile.display_name,
      avatarUrl: resolvedAvatarUrl,
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
          Retour à mon profil
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
        {useMockProfileApi && (
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
              name="profileAvatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700"
            />
            {pendingAvatarFile && !isUploadingAvatar && (
              <p className="mt-2 text-sm text-gray-500">
                Fichier sélectionné — il sera envoyé à la sauvegarde.
              </p>
            )}
            {isUploadingAvatar && <p className="mt-2 text-sm text-gray-600">Upload en cours...</p>}
            {avatarUploadError && <p className="mt-2 text-sm text-red-600">{avatarUploadError}</p>}
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

          {isStudent && (
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
                  value={effectiveFaculty}
                  onChange={(event) => {
                    setSelectedFaculty(event.target.value)
                    setSelectedMajor('')
                  }}
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
                  value={effectiveMajorValue}
                  onChange={(event) => {
                    setSelectedMajor(event.target.value)
                  }}
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
              disabled={updateProfileMutation.isPending || isUploadingAvatar}
            >
              {updateProfileMutation.isPending || isUploadingAvatar
                ? 'Enregistrement...'
                : 'Enregistrer le profil'}
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
