import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const appState = vi.hoisted(() => {
  const s = { favSet: new Set(), toggleFavorite: vi.fn(), isAuthenticated: true, login: vi.fn() }
  s.isFavorite = (id) => s.favSet.has(id)
  return s
})
vi.mock('../../contexts/useApp', () => ({ useApp: () => appState }))

import FavoriteButton from './FavoriteButton'

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appState.favSet = new Set()
    appState.isAuthenticated = true
  })

  it('labels itself "add" when not favourited and toggles the favourite on click', () => {
    render(<FavoriteButton eventId="e1" />)
    const btn = screen.getByRole('button', { name: 'Ajouter aux favoris' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(appState.toggleFavorite).toHaveBeenCalledWith('e1')
  })

  it('labels itself "remove" when already favourited', () => {
    appState.favSet = new Set(['e1'])
    render(<FavoriteButton eventId="e1" />)
    const btn = screen.getByRole('button', { name: 'Retirer des favoris' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('sends a visitor to login instead of toggling', () => {
    appState.isAuthenticated = false
    render(<FavoriteButton eventId="e1" />)
    fireEvent.click(screen.getByRole('button'))
    expect(appState.login).toHaveBeenCalledTimes(1)
    expect(appState.toggleFavorite).not.toHaveBeenCalled()
  })
})
