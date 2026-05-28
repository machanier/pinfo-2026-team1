import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import MainLayout from './MainLayout'

const studentContext = {
  userRole: 'STUDENT',
  setUserRole: () => {},
  displayName: 'Jean Etudiant',
  setDisplayName: () => {},
  isAuthenticated: true,
  logout: () => {},
  savedEvents: [],
  setSavedEvents: () => {},
}

describe('MainLayout', () => {
  it('opens and closes mobile sidebar overlay', () => {
    render(
      <AppContext.Provider value={studentContext}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>Home content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    expect(screen.getByText(/Home content/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Fermer le menu/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Ouvrir le menu/i))
    expect(screen.getByLabelText(/Fermer le menu/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/Fermer le menu/i))
    expect(screen.queryByLabelText(/Fermer le menu/i)).not.toBeInTheDocument()
  })

  it('marks notifications link as active and shows the user menu in navbar', () => {
    render(
      <AppContext.Provider value={studentContext}>
        <MemoryRouter initialEntries={['/notifications']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/notifications" element={<div>Notifications content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    const topNavbar = screen.getAllByRole('navigation')[0]
    const notificationsLink = within(topNavbar).getByRole('link', { name: /Notifications/i })
    // Lien actif : style rose du redesign (l'ancien thème noir/blanc a disparu).
    expect(notificationsLink.className).toMatch(/bg-pink-50/)
    // Le menu utilisateur (avatar) porte le nom complet dans son attribut title.
    const userMenu = within(topNavbar).getByRole('button', { name: /Menu utilisateur/i })
    expect(userMenu.getAttribute('title')).toMatch(/Jean/)
  })

  it('toggles the navigation layout and persists it to localStorage', () => {
    render(
      <AppContext.Provider value={studentContext}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<div>Home content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    // Defaults to 'sidebar'; the navbar's toggle switches it to 'topbar'.
    fireEvent.click(screen.getByLabelText('Changer de disposition'))
    expect(localStorage.getItem('layoutMode')).toBe('topbar')
  })
})
