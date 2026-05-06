import { Link, useLocation } from 'react-router-dom'
import { Bell, Calendar, Menu, Search, User, LogOut } from 'lucide-react'
import { useApp } from '../../contexts/useApp'
import { useState } from 'react'

export function Navbar({ onMenuToggle }) {
  const location = useLocation()
  const { displayName, logout, isAuthenticated, userRole } = useApp()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const isAdmin = userRole === 'ADMIN'

  const isActive = (path) => location.pathname === path

  const navLinkClass = (path) =>
    `inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
      isActive(path)
        ? 'bg-black text-white hover:opacity-90'
        : 'bg-transparent text-gray-700 hover:bg-gray-100'
    }`

  /**
   * Gère le logout
   * Appelle la fonction logout() du AppContext qui efface les données
   * et redirige vers /login
   */
  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
  }

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
              <span className="text-lg font-bold text-gray-900">UnigEvents</span>
            </Link>
          </div>

          <div className="hidden flex-1 px-4 md:flex md:justify-center">
            <label className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un événement"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-pink-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/notifications" className={navLinkClass('/notifications')}>
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </Link>

                {/* Menu Utilisateur */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={navLinkClass('/profile')}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline flex items-center gap-2">
                      {displayName.split(' ')[0]}
                      {isAdmin && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                          Admin
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <User className="h-4 w-4" />
                          Mon Profil
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          Déconnexion
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un événement"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-pink-500 focus:outline-none"
            />
          </label>
        </div>
      </div>
    </nav>
  )
}
