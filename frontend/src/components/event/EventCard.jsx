import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useApp } from '../../contexts/useApp'
import { cloudinaryOptimized } from '../../lib/cloudinaryAvatar'

const fmtDate = (t) =>
  new Date(t).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Event card in the current site style (pink accents, emoji meta) with a
 * cover image and a favourite toggle. `to` makes the whole card a link.
 */
export default function EventCard({ event, to, showFavorite = true }) {
  const { isFavorite, toggleFavorite } = useApp()
  const fav = isFavorite ? isFavorite(event.eventId) : false
  const rawImage = event.bannerImageUrl || event.bannerUrl || event.imageUrl || null
  const image = rawImage?.includes('cloudinary.com') ? cloudinaryOptimized(rawImage, 400) : rawImage

  const onFav = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite?.(event.eventId)
  }

  const body = (
    <>
      <div className="relative">
        {image ? (
          <>
            <img
              src={image}
              alt={`Bannière – ${event.title}`}
              loading="lazy"
              className="h-44 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            {/* Title + category overlaid on the gradient */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              {event.category && (
                <span className="mb-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  {event.category}
                </span>
              )}
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
                {event.title}
              </h3>
            </div>
          </>
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-pink-50 text-4xl">🗓</div>
        )}
        {!image && event.category && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-pink-600 shadow-sm">
            {event.category}
          </span>
        )}
        {showFavorite && (
          <button
            type="button"
            onClick={onFav}
            aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm transition hover:text-pink-600"
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-pink-600 text-pink-600' : ''}`} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {!image && (
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 group-hover:text-pink-600">
            {event.title}
          </h3>
        )}
        <div className="space-y-1 text-xs text-gray-400">
          {event.time && <p>🗓 {fmtDate(event.time)}</p>}
          {event.place && <p>📍 {event.place}</p>}
          {event.capacity && <p>👥 {event.capacity} places</p>}
        </div>
        {event.description && (
          <p className="line-clamp-2 text-xs text-gray-500">{event.description}</p>
        )}
      </div>
    </>
  )

  const cls =
    'group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:border-pink-200 hover:shadow-md'

  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
