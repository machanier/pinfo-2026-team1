import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../contexts/useApp'
import Badge from '../components/ui/badge'
import {
  fetchProfile,
  formatDate,
  mockModeEnabled,
  normalizeProfileData,
  resolveProfileId,
} from '../lib/profileUtils'

export default function ProfilePage() {
  const { id: routeId } = useParams()
  const { userRole, savedEvents = [], currentUserId } = useApp()
  const isOwnProfile = !routeId || (Boolean(currentUserId) && routeId === currentUserId)

  const profileId = resolveProfileId(routeId, currentUserId)

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
  const profileRole = normalizedProfile.role
  const isOrganizer = profileRole === 'ORGANIZER'
  const isAdmin = profileRole === 'ADMIN'
  const isStudent = profileRole === 'STUDENT'
  const associationProfile = normalizedProfile.association_profile

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

  const studentProfile = normalizedProfile.student_profile
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil Utilisateur</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* En-tête avec couverture*/}
        <div className="h-32 bg-gradient-to-r from-pink-400 to-pink-600"></div>

        <div className="px-6 pb-6">
          {mockModeEnabled && (
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
                <div className="w-full h-full bg-pink-100 rounded-full flex items-center justify-center text-pink-500 text-3xl font-bold">
                  {normalizedProfile.display_name
                    ? normalizedProfile.display_name.charAt(0).toUpperCase()
                    : 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Informations Publiques */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{normalizedProfile.display_name}</h2>
            <div className="mt-2">
              <Badge variant={isOrganizer || isAdmin ? 'default' : 'secondary'}>
                {isAdmin ? 'Administrateur' : isOrganizer ? 'Organisateur' : 'Etudiant'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-gray-600">{normalizedProfile.email}</p>
            <p className="mt-1 text-xs text-gray-500">
              Membre depuis le {formatDate(normalizedProfile.created_at)}
            </p>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            {isOwnProfile && (
              <Link
                to="/profile/edit"
                className="inline-flex items-center rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95"
              >
                Editer mon profil
              </Link>
            )}
          </div>

          {isOrganizer && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">À propos</h3>
              <p className="text-gray-600 leading-relaxed">
                {associationProfile?.description ||
                  "En charge de la creation et de la gestion d'evenements associatifs et universitaires."}
              </p>
            </div>
          )}

          {isStudent && (
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
                  <p className="text-xs uppercase tracking-wide text-gray-500">Majeur</p>
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
