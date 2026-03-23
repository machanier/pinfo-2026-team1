import { Link, useLocation } from 'react-router-dom'
import { Compass, Calendar, Users, Settings, LayoutDashboard, Plus, Bell } from 'lucide-react'
import { useApp } from '../../contexts/useApp'

export default function Sidebar() {
  const location = useLocation()
  const { userRole } = useApp()

  const studentLinks = [
    { to: '/', label: 'Explorer', icon: Compass },
    { to: '/my-events', label: 'Mes Inscriptions', icon: Calendar },
    { to: '/calendar', label: 'Calendrier', icon: Calendar },
    { to: '/following', label: 'Organisateurs suivis', icon: Users },
    { to: '/settings', label: 'Paramètres', icon: Settings },
  ]

  const organizerLinks = [
    { to: '/organizer', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/my-events', label: 'Mes Événements', icon: Calendar },
    { to: '/create-event', label: 'Nouvel Événement', icon: Plus },
    { to: '/participants', label: 'Liste des participants', icon: Users },
    { to: '/announcements', label: 'Annonces', icon: Bell },
  ]

  const links = userRole === 'ORGANIZER' ? organizerLinks : studentLinks

  return (
    <aside className="hidden md:block md:w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
      <nav className="p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.to

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-pink-50 text-pink-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-pink-600' : 'text-gray-500'}`} />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
