/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useAppMock, useUnreadCountMock } = vi.hoisted(() => ({
  useAppMock: vi.fn(),
  useUnreadCountMock: vi.fn(),
}))

vi.mock('../../contexts/useApp', () => ({
  useApp: () => useAppMock(),
}))

vi.mock('../../hooks/useNotifications', () => ({
  useUnreadCount: () => useUnreadCountMock(),
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
    // Default: no unread notifications
    useUnreadCountMock.mockReturnValue({ data: 0 })
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

  it('renders inline nav links and the layout toggle in topbar mode', () => {
    const onToggleLayout = vi.fn()
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'STUDENT',
      savedEvents: [],
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar layoutMode="topbar" onToggleLayout={onToggleLayout} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Changer de disposition'))
    expect(onToggleLayout).toHaveBeenCalledTimes(1)
  })

  it('shows unread badge on bell icon when count > 0', () => {
    useUnreadCountMock.mockReturnValue({ data: 5 })
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'STUDENT',
      savedEvents: [],
      logout: vi.fn(),
    })

    renderNavbar()

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows 99+ when unread count exceeds 99', () => {
    useUnreadCountMock.mockReturnValue({ data: 120 })
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'STUDENT',
      savedEvents: [],
      logout: vi.fn(),
    })

    renderNavbar()

    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('hides unread badge when count is 0', () => {
    useUnreadCountMock.mockReturnValue({ data: 0 })
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'STUDENT',
      savedEvents: [],
      logout: vi.fn(),
    })

    renderNavbar()

    // Badge span should not appear in the DOM
    const bell = screen.getByRole('link', { name: /Notifications/i })
    expect(bell.querySelector('.rounded-full.bg-pink-600')).toBeNull()
  })

  it('toggles the mobile nav dropdown in topbar mode', () => {
    useAppMock.mockReturnValue({
      isAuthenticated: true,
      displayName: 'Ada Lovelace',
      userRole: 'STUDENT',
      savedEvents: [],
      logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <Navbar layoutMode="topbar" onToggleLayout={vi.fn()} />
      </MemoryRouter>,
    )

    // Desktop inline row shows each link once.
    expect(screen.getAllByRole('link', { name: 'Accueil' })).toHaveLength(1)
    // The hamburger opens the mobile dropdown, which repeats the links.
    fireEvent.click(screen.getByLabelText('Ouvrir le menu'))
    expect(screen.getAllByRole('link', { name: 'Accueil' }).length).toBeGreaterThan(1)
  })
})
