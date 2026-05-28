import { Home, Search, Calendar, Plus, Bell, Ticket } from 'lucide-react'

// Shared between the Sidebar and the Navbar (top-bar layout mode).
// `public: true` = visible aussi pour un visiteur non connecté.
// Profil/paramètres vivent dans le menu avatar, pas ici.
export const studentLinks = [
  { to: '/', label: 'Accueil', icon: Home, public: true },
  { to: '/search', label: 'Recherche', icon: Search, public: true },
  { to: '/my-events', label: 'Mes Inscriptions', icon: Ticket },
  { to: '/calendar', label: 'Calendrier', icon: Calendar },
]

export const organizerLinks = [
  { to: '/', label: 'Accueil', icon: Home, public: true },
  { to: '/search', label: 'Recherche', icon: Search, public: true },
  { to: '/my-events', label: 'Mes Événements', icon: Ticket },
  { to: '/events/create', label: 'Nouvel Événement', icon: Plus },
  { to: '/notifications', label: 'Annonces', icon: Bell },
]

export function getNavLinks(role, isAuthenticated = true) {
  const links = role === 'ORGANIZER' || role === 'ADMIN' ? organizerLinks : studentLinks
  return isAuthenticated ? links : links.filter((l) => l.public)
}
