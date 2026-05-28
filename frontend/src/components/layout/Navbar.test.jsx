/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useAppMock } = vi.hoisted(() => ({
  useAppMock: vi.fn(),
}))

vi.mock('../../contexts/useApp', () => ({
  useApp: () => useAppMock(),
}))

import { Navbar } from './Navbar'

function renderNavbar({ path = '/', onMenuToggle } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar onMenuToggle={onMenuToggle} />
    </MemoryRouter>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows login CTA for unauthenticated users', () => {
    useAppMock.mockReturnValue({
      isAuthenticated: false,
      displayName: '',
      logout: vi.fn(),
    })

    renderNavbar()

    expect(screen.getByText('Connexion')).toBeInTheDocument()
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })

  it('renders authenticated navigation and supports logout', () => {
    const logout = vi.fn()
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'ORGANIZER',
      logout,
    })

    renderNavbar({ path: '/notifications' })

    const notificationsLink = screen.getByRole('link', { name: /Notifications/i })
    expect(notificationsLink).toHaveClass('bg-pink-50')

    fireEvent.click(screen.getByLabelText('Menu utilisateur'))
    expect(screen.getByText('Mon Profil')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Déconnexion'))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Mon Profil')).not.toBeInTheDocument()
  })

  it('shows an admin badge for admin users', () => {
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Root User',
      userRole: 'ADMIN',
      logout: vi.fn(),
    })

    renderNavbar()

    // Le rôle s'affiche dans le menu avatar (déroulant), pas comme badge permanent.
    fireEvent.click(screen.getByLabelText('Menu utilisateur'))
    expect(screen.getByText('Administrateur')).toBeInTheDocument()
  })

  it('calls onMenuToggle when the menu button is clicked', () => {
    const onMenuToggle = vi.fn()
    useAppMock.mockReturnValue({
      isAuthenticated: false,
      displayName: '',
      logout: vi.fn(),
    })

    renderNavbar({ onMenuToggle })

    fireEvent.click(screen.getByLabelText('Ouvrir le menu'))
    expect(onMenuToggle).toHaveBeenCalledTimes(1)
  })

  it('renders the logo image with correct alt text', () => {
    useAppMock.mockReturnValue({
      isAuthenticated: false,
      displayName: '',
      logout: vi.fn(),
    })

    renderNavbar()

    const logo = screen.getByAltText('UNIGEvents logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/logo.png')
  })

  it('closes user menu when clicking "Mon Profil" link', () => {
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'ORGANIZER',
      logout: vi.fn(),
    })

    renderNavbar()

    fireEvent.click(screen.getByLabelText('Menu utilisateur'))
    expect(screen.getByText('Mon Profil')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Mon Profil'))
    expect(screen.queryByText('Mon Profil')).not.toBeInTheDocument()
  })

  it('closes user menu when clicking outside', () => {
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'ORGANIZER',
      logout: vi.fn(),
    })

    renderNavbar()

    fireEvent.click(screen.getByLabelText('Menu utilisateur'))
    expect(screen.getByText('Mon Profil')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Mon Profil')).not.toBeInTheDocument()
  })
})
