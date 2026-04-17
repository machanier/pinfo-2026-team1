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

  it('marks notifications link as active and shows first name in navbar', () => {
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
    const profileLink = within(topNavbar).getByRole('link', { name: /Jean/i })

    expect(notificationsLink.className).toMatch(/bg-black text-white/)
    expect(profileLink.className).toMatch(/bg-transparent text-gray-700/)
  })
})
