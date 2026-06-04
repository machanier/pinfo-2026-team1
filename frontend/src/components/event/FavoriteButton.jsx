import { Heart } from 'lucide-react'
import { useApp } from '../../contexts/useApp'

/**
 * Reusable favourite (heart) toggle for an event. Safe to drop inside a <Link>:
 * the click is stopped so it toggles the favourite instead of navigating.
 * Visitors are sent to login on click. Style the button via `className`
 * (size + background) and the icon via `iconClassName`.
 */
export default function FavoriteButton({ eventId, className = '', iconClassName = 'h-5 w-5' }) {
  const { isFavorite, toggleFavorite, isAuthenticated, login } = useApp()
  const fav = isFavorite ? isFavorite(eventId) : false

  const onClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      login()
      return
    }
    toggleFavorite?.(eventId)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={fav}
      aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`inline-flex items-center justify-center rounded-full transition ${className}`}
    >
      <Heart className={`${iconClassName} ${fav ? 'fill-pink-600 text-pink-600' : ''}`} />
    </button>
  )
}
