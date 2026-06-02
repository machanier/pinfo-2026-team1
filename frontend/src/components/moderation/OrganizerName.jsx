import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchEventDetail } from '../../lib/apiServices'

/**
 * Resolves an event's organizer name (via the event the case points to) so the
 * moderation queue shows a readable name instead of a raw UUID. Falls back to a
 * short organizer id while loading or when the event no longer exists.
 *
 * The query key is shared with AdminModerationDetailPage's eventDetail query, so
 * opening a case after seeing it in the list reuses the cached event.
 */
export default function OrganizerName({ eventId, organizerId }) {
  const { data } = useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: () => fetchEventDetail(eventId),
    enabled: !!eventId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const shortId = organizerId ? `${organizerId.slice(0, 8)}…` : '—'

  if (!data?.organizerName) {
    return (
      <span className="font-mono text-xs text-gray-500" title={organizerId}>
        {shortId}
      </span>
    )
  }

  return (
    <Link
      to={`/organizers/${organizerId}`}
      className="text-pink-600 hover:underline"
      title={organizerId}
    >
      {data.organizerName}
    </Link>
  )
}
