import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Badge from '../components/ui/badge'
import { fetchEvents } from '../lib/apiServices'
import { fetchProfile, formatDate, normalizeProfileData } from '../lib/profileUtils'

/**
 * Page publique d'un organisateur (route /organizers/:id).
 *
 * Atteinte en cliquant sur le nom d'un organisateur (fiche événement, file de
 * modération…). La route est publique : un visiteur anonyme doit pouvoir
 * l'ouvrir. On s'appuie donc sur deux sources avec des niveaux d'accès
 * différents :
 *   - les événements publiés (GET /api/events?status=PUBLISHED) sont publics et
 *     constituent le contenu principal ;
 *   - le profil détaillé (GET /api/users/:id) est protégé par rôle, donc on
 *     l'enrichit pour les visiteurs connectés mais on dégrade proprement sinon
 *     (le nom est alors récupéré depuis le champ organizerName des événements).
 */
export default function OrganizerProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const eventsQuery = useQuery({
    queryKey: ['organizerPublicEvents', id],
    queryFn: () => fetchEvents({ organizerId: id, status: 'PUBLISHED', size: 20 }),
    enabled: Boolean(id),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })

  const profileQuery = useQuery({
    queryKey: ['organizerProfile', id],
    queryFn: () => fetchProfile(id, 'ORGANIZER'),
    enabled: Boolean(id),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })

  const publishedEvents = eventsQuery.data?.content ?? []
  const profile = profileQuery.data ? normalizeProfileData(profileQuery.data, 'ORGANIZER') : null

  const organizerNameFromEvent = publishedEvents.find((event) => event.organizerName)?.organizerName
  const hasRealProfileName =
    Boolean(profile?.display_name) && profile.display_name !== 'Utilisateur anonyme'
  const displayName = hasRealProfileName
    ? profile.display_name
    : organizerNameFromEvent || 'Organisateur'

  const description = profile?.association_profile?.description
  const avatarUrl = profile?.avatar_url || null
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : null

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 text-sm text-blue-600 hover:underline"
      >
        ← Retour
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profil organisateur</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-pink-400 to-pink-600"></div>

        <div className="px-6 pb-6">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`Logo de ${displayName}`}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-pink-100 rounded-full flex items-center justify-center text-pink-500 text-3xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
            <div className="mt-2">
              <Badge variant="default">Organisateur</Badge>
            </div>
            {memberSince && (
              <p className="mt-1 text-xs text-gray-500">Membre depuis le {memberSince}</p>
            )}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">À propos</h3>
            <p className="text-gray-600 leading-relaxed">
              {description ||
                "En charge de la création et de la gestion d'événements associatifs et universitaires."}
            </p>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Événements publiés</h3>

            {eventsQuery.isLoading && (
              <p className="text-sm text-gray-400">Chargement des événements…</p>
            )}

            {!eventsQuery.isLoading && eventsQuery.isError && (
              <p className="text-sm text-red-600">
                Impossible de charger les événements de cet organisateur.
              </p>
            )}

            {!eventsQuery.isLoading && !eventsQuery.isError && publishedEvents.length === 0 && (
              <p className="text-sm text-gray-500">Aucun événement publié pour le moment.</p>
            )}

            {publishedEvents.length > 0 && (
              <ul className="space-y-2">
                {publishedEvents.map((event) => (
                  <li
                    key={event.eventId}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                  >
                    <span className="text-sm text-gray-800 line-clamp-1">{event.title}</span>
                    <Link
                      to={`/events/${event.eventId}`}
                      className="ml-4 shrink-0 text-sm font-medium text-pink-600 hover:underline"
                    >
                      Voir →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
