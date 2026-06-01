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

import Sidebar from './Sidebar'

function renderSidebar({
  path = '/',
  userRole = 'STUDENT',
  isOpen = true,
  onNavigate = vi.fn(),
} = {}) {
  useAppMock.mockReturnValue({ userRole })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar isOpen={isOpen} onNavigate={onNavigate} />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Role-based link sets ─────────────────────────────────────────────────

  it('renders student links for STUDENT role', () => {
    renderSidebar({ userRole: 'STUDENT' })

    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Recherche')).toBeInTheDocument()
    expect(screen.getByText('Mes Inscriptions')).toBeInTheDocument()
    expect(screen.getByText('Calendrier')).toBeInTheDocument()
  })

  it('renders organizer links for ORGANIZER role', () => {
    renderSidebar({ userRole: 'ORGANIZER' })

    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Recherche')).toBeInTheDocument()
    expect(screen.getByText('Mes Événements')).toBeInTheDocument()
    expect(screen.getByText('Nouvel Événement')).toBeInTheDocument()
    expect(screen.getByText('Annonces')).toBeInTheDocument()
  })

  it('renders organizer links for ADMIN role', () => {
    renderSidebar({ userRole: 'ADMIN' })

    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Mes Événements')).toBeInTheDocument()
    expect(screen.getByText('Nouvel Événement')).toBeInTheDocument()
  })

  it('renders the Modération link for ADMIN role and points it to /admin/moderation', () => {
    renderSidebar({ userRole: 'ADMIN' })

    const link = screen.getByText('Modération').closest('a')
    expect(link).toHaveAttribute('href', '/admin/moderation')
  })

  it('does not render the Modération link for ORGANIZER role', () => {
    renderSidebar({ userRole: 'ORGANIZER' })

    expect(screen.queryByText('Modération')).not.toBeInTheDocument()
  })

  it('does not render the Modération link for STUDENT role', () => {
    renderSidebar({ userRole: 'STUDENT' })

    expect(screen.queryByText('Modération')).not.toBeInTheDocument()
  })

  it('does not show student-only links for ORGANIZER', () => {
    renderSidebar({ userRole: 'ORGANIZER' })

    expect(screen.queryByText('Mes Inscriptions')).not.toBeInTheDocument()
    expect(screen.queryByText('Explorer')).not.toBeInTheDocument()
    expect(screen.queryByText('Calendrier')).not.toBeInTheDocument()
  })

  it('does not show organizer-only links for STUDENT', () => {
    renderSidebar({ userRole: 'STUDENT' })

    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument()
    expect(screen.queryByText('Nouvel Événement')).not.toBeInTheDocument()
    expect(screen.queryByText('Annonces')).not.toBeInTheDocument()
  })

  // ── Active link highlighting ──────────────────────────────────────────────

  it('highlights the active link when on its exact path', () => {
    renderSidebar({ userRole: 'STUDENT', path: '/calendar' })

    const link = screen.getByText('Calendrier').closest('a')
    expect(link).toHaveClass('text-pink-700')
    expect(link).toHaveClass('bg-pink-50')
  })

  it('marks "/" as active only on the exact root path', () => {
    renderSidebar({ userRole: 'STUDENT', path: '/' })

    const link = screen.getByText('Accueil').closest('a')
    expect(link).toHaveClass('text-pink-700')
  })

  it('does not mark "/" as active when on a sub-path', () => {
    renderSidebar({ userRole: 'STUDENT', path: '/calendar' })

    const accueilLink = screen.getByText('Accueil').closest('a')
    expect(accueilLink).not.toHaveClass('text-pink-700')
  })

  it('marks a link active when the path starts with the link target', () => {
    renderSidebar({ userRole: 'STUDENT', path: '/my-events/detail' })

    const link = screen.getByText('Mes Inscriptions').closest('a')
    expect(link).toHaveClass('text-pink-700')
  })

  it('does not highlight other links when one link is active', () => {
    renderSidebar({ userRole: 'STUDENT', path: '/calendar' })

    const accueilLink = screen.getByText('Accueil').closest('a')
    expect(accueilLink).not.toHaveClass('text-pink-700')
  })

  // ── onNavigate callback ───────────────────────────────────────────────────

  it('calls onNavigate when a link is clicked', () => {
    const onNavigate = vi.fn()
    renderSidebar({ userRole: 'STUDENT', onNavigate })

    fireEvent.click(screen.getByText('Calendrier'))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('calls onNavigate for organizer links too', () => {
    const onNavigate = vi.fn()
    renderSidebar({ userRole: 'ORGANIZER', onNavigate })

    fireEvent.click(screen.getByText('Annonces'))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  // ── Visibility (isOpen) ───────────────────────────────────────────────────

  it('is visible when isOpen is true', () => {
    renderSidebar({ isOpen: true })

    const aside = screen.getByRole('navigation').closest('aside')
    expect(aside).not.toHaveClass('-translate-x-full')
  })

  it('is hidden (translated off-screen) when isOpen is false', () => {
    renderSidebar({ isOpen: false })

    const aside = screen.getByRole('navigation').closest('aside')
    expect(aside).toHaveClass('-translate-x-full')
  })
})
