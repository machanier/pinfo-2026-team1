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
      logout,
    })

    renderNavbar({ path: '/notifications' })

    const notificationsLink = screen.getByText('Notifications').closest('a')
    expect(notificationsLink).toHaveClass('bg-black')

    fireEvent.click(screen.getByText('Ada'))
    expect(screen.getByText('Mon Profil')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Déconnexion'))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Mon Profil')).not.toBeInTheDocument()
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
})
