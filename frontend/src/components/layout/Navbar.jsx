import { Link, useLocation } from 'react-router-dom'
import { Bell, Menu, User, LogOut, PanelLeft, PanelTop, Heart } from 'lucide-react'
import { useApp } from '../../contexts/useApp'
import { useState, useRef, useEffect } from 'react'
import { getNavLinks } from './navItems'

const ROLE_LABELS = {
  ADMIN: 'Administrateur',
  ORGANIZER: 'Organisateur',
  STUDENT: 'Étudiant·e',
}

export function Navbar({ onMenuToggle, layoutMode = 'sidebar', onToggleLayout }) {
  const location = useLocation()
  const { displayName, logout, isAuthenticated, userRole, savedEvents = [] } = useApp()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userMenuRef = useRef(null)
  const isTopbar = layoutMode === 'topbar'
  const links = getNavLinks(userRole, isAuthenticated)
  const initial = (displayName || 'U').trim().charAt(0).toUpperCase()

  const isActive = (path) => location.pathname === path
  const isLinkActive = (to) =>
    to === '/'
      ? location.pathname === '/'
      : location.pathname === to || location.pathname.startsWith(`${to}/`)

  useEffect(() => {
    if (!showUserMenu) return
    const onPointerDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    const onKey = (e) => e.key === 'Escape' && setShowUserMenu(false)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showUserMenu])

  const actionBtn = (active) =>
    `inline-flex h-10 w-10 items-center justify-center rounded-md ${
      active ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
    }`

  const topLinkClass = (to) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
      isLinkActive(to) ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
    }`

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {links.length > 0 && (
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 text-gray-700 md:hidden"
                onClick={isTopbar ? () => setMobileNavOpen((v) => !v) : onMenuToggle}
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <img
                src="/logo.png"
                alt="UNIGEvents logo"
                width="40"
                height="40"
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">UNIGEvents</span>
            </Link>

            {/* Mode top-bar : liens de navigation sur le même bandeau (desktop) */}
            {isTopbar && links.length > 0 && (
              <div className="ml-2 hidden items-center gap-0.5 md:flex">
                {links.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      title={link.label}
                      className={topLinkClass(link.to)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="hidden lg:inline">{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {onToggleLayout && (
              <button
                type="button"
                onClick={onToggleLayout}
                title={isTopbar ? 'Passer à la barre latérale' : 'Passer à la barre du haut'}
                aria-label="Changer de disposition"
                className={actionBtn(false)}
              >
                {isTopbar ? <PanelLeft className="h-5 w-5" /> : <PanelTop className="h-5 w-5" />}
              </button>
            )}

            {isAuthenticated ? (
              <>
                <Link
                  to="/notifications"
                  title="Notifications"
                  aria-label="Notifications"
                  className={actionBtn(isActive('/notifications'))}
                >
                  <Bell className="h-5 w-5" />
                </Link>

                <Link
                  to="/search?fav=1"
                  title="Mes favoris"
                  aria-label="Mes favoris"
                  className={`relative ${actionBtn(false)}`}
                >
                  <Heart className="h-5 w-5" />
                  {savedEvents.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-semibold text-white">
                      {savedEvents.length}
                    </span>
                  )}
                </Link>

                {/* Menu Utilisateur */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((v) => !v)}
                    title={displayName}
                    aria-label="Menu utilisateur"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700 transition hover:bg-pink-200"
                  >
                    {initial}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ROLE_LABELS[userRole] ?? 'Étudiant·e'}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="h-4 w-4" />
                          Mon Profil
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
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
                className="inline-flex items-center justify-center rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mode top-bar : menu déroulant mobile */}
      {isTopbar && links.length > 0 && mobileNavOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="space-y-1 px-4 py-2">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    isLinkActive(link.to)
                      ? 'bg-pink-50 text-pink-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
