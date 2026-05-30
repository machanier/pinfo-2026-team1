// src/layouts/MainLayout.jsx
import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import Footer from '../components/layout/Footer'
import { useApp } from '../contexts/useApp'

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // 'sidebar' = barre latérale gauche (actuel) | 'topbar' = navigation dans la barre du haut
  const [layoutMode, setLayoutMode] = useState(
    () => localStorage.getItem('layoutMode') || 'sidebar',
  )
  const { isDemo } = useApp()
  const mainRef = useRef(null)
  const { pathname } = useLocation()

  // Revenir en haut de la zone de contenu à chaque changement de page
  // (sinon on garde la position de défilement de la page précédente).
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  const closeSidebar = () => setIsSidebarOpen(false)

  const toggleLayout = () => {
    setLayoutMode((mode) => {
      const next = mode === 'sidebar' ? 'topbar' : 'sidebar'
      try {
        localStorage.setItem('layoutMode', next)
      } catch {
        /* ignore storage errors */
      }
      setIsSidebarOpen(false)
      return next
    })
  }

  const showSidebar = layoutMode === 'sidebar'

  return (
    <div className="flex h-screen flex-col">
      {isDemo && (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          Mode aperçu — données de démonstration · navigation sans connexion
        </div>
      )}
      <Navbar
        onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        layoutMode={layoutMode}
        onToggleLayout={toggleLayout}
      />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar isOpen={isSidebarOpen} onNavigate={closeSidebar} />}
        {showSidebar && isSidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={closeSidebar}
          />
        )}
        <main ref={mainRef} className="flex flex-1 flex-col overflow-y-auto bg-gray-50">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
