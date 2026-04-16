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
} from '../lib/profileUtils'

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

    if (!profileId || !canEditThisProfile) {
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
