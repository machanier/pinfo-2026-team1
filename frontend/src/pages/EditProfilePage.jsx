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
import { deleteUser } from '../lib/apiServices'
import { FACULTY_OPTIONS, PROGRAM_OPTIONS_BY_FACULTY } from '../lib/universityData'
import {
  avatarTooLargeMessage,
  isAvatarOverSized,
  uploadAvatarToCloudinary,
} from '../lib/cloudinaryAvatar'

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
  const { userRole, currentUserId, logout } = useApp()
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('')
  const [avatarUploadError, setAvatarUploadError] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  // File staged for upload — only sent to Cloudinary when the form is saved
  // to avoid creating orphaned assets on cancellation or repeated picks.
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null)
  const [selectedFaculty, setSelectedFaculty] = useState('')
  const [selectedMajor, setSelectedMajor] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Revoke the object URL when the preview changes or on unmount.
  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview)
      }
    }
  }, [pendingAvatarPreview])

  const profileId = resolveProfileId(routeId, currentUserId)
  // Permission should be evaluated against the resolved profile id (the real target).
  // profileId === 'me' means the current user's own profile (backendUserId not yet loaded).
  const canEditThisProfile =
    profileId === 'me' || (Boolean(currentUserId) && profileId === currentUserId)
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

  const deleteAccountMutation = useMutation({
    mutationFn: () => deleteUser(editableProfileId),
    onSuccess: () => {
      logout()
    },
  })

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

    // Vuln 13 follow-up: reject too-large files before staging anything so the
    // user gets immediate feedback instead of waiting for the save action to
    // fail. uploadAvatarToCloudinary re-validates as a safety net — see
    // src/lib/cloudinaryAvatar.js for the rationale.
    if (isAvatarOverSized(file)) {
      setAvatarUploadError(avatarTooLargeMessage(file.size))
      // Reset the input so re-selecting the same file fires onChange again.
      event.target.value = ''
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
    const status = profileQuery.error?.response?.status
    const errorMessage =
      status === 403
        ? "Accès refusé (403) : votre compte n'a pas de rôle assigné. Déconnecte-toi et reconnecte-toi, ou contacte un administrateur."
        : status === 401
          ? 'Session expirée. Déconnecte-toi et reconnecte-toi.'
          : "Impossible de charger le profil. Vérifie la disponibilité de l'API."
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          {errorMessage}
        </div>
      </div>
    )
  }

  return (
    <>
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-account-title" className="text-lg font-semibold text-gray-900">
              Supprimer mon compte
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Cette action est <span className="font-semibold">irréversible</span>. Ton compte sera
              désactivé et tu seras déconnecté(e). Veux-tu vraiment continuer ?
            </p>
            {deleteAccountMutation.isError && (
              <p className="mt-3 text-sm text-red-600">
                Impossible de supprimer le compte. Réessaie.
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteAccountMutation.isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleteAccountMutation.isPending ? 'Suppression…' : 'Supprimer mon compte'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {isUploadingAvatar && (
                <p className="mt-2 text-sm text-gray-600">Upload en cours...</p>
              )}
              {avatarUploadError && (
                <p className="mt-2 text-sm text-red-600">{avatarUploadError}</p>
              )}
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

          <div className="mt-8 border-t border-red-100 pt-6">
            <h2 className="text-sm font-semibold text-red-700 mb-1">Zone dangereuse</h2>
            <p className="text-sm text-gray-500 mb-3">
              La suppression de ton compte est irréversible.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="border border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Supprimer mon compte
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
