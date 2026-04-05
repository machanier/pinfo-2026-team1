import { Link, useLocation } from 'react-router-dom'
import { Bell, Calendar, Menu, Search, User } from 'lucide-react'
import { useApp } from '../../contexts/useApp'

export function Navbar({ onMenuToggle }) {
  const location = useLocation()
  const { display_name } = useApp()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-700 md:hidden"
              onClick={onMenuToggle}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <Calendar className="h-7 w-7 text-pink-600" />
              <span className="text-lg font-bold text-gray-900">UniEvents</span>
            </Link>
          </div>

          <div className="hidden flex-1 px-4 md:flex md:justify-center">
            <label className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un evenement"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-pink-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
                isActive('/notifications')
                  ? 'bg-black text-white hover:opacity-90'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </Link>

            <Link
              to="/profile"
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
                isActive('/profile')
                  ? 'bg-black text-white hover:opacity-90'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{display_name.split(' ')[0]}</span>
            </Link>
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un evenement"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-pink-500 focus:outline-none"
            />
          </label>
        </div>
      </div>
    </nav>
  )
}
