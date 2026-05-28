import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../../contexts/useApp'
import { getNavLinks } from './navItems'

export default function Sidebar({ isOpen, onNavigate }) {
  const location = useLocation()
  const { userRole, isAuthenticated } = useApp()
  const links = getNavLinks(userRole, isAuthenticated)

  const isPathActive = (to) => {
    if (to === '/') {
      return location.pathname === '/'
    }

    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  return (
    <aside
      className={`fixed inset-y-20 left-0 z-40 w-72 border-r border-gray-200 bg-white p-0 shadow-xl transition-transform md:static md:inset-auto md:z-auto md:w-64 md:translate-x-0 md:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = isPathActive(link.to)

          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-pink-50 text-pink-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-pink-700' : 'text-gray-500'}`} />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
