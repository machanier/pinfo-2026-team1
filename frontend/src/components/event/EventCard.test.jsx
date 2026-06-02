import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const toggleFavorite = vi.fn()
const login = vi.fn()
let favorite = false
let authed = true
vi.mock('../../contexts/useApp', () => ({
  useApp: () => ({ isFavorite: () => favorite, toggleFavorite, isAuthenticated: authed, login }),
}))

import EventCard from './EventCard'

const event = {
  eventId: 'e1',
  title: 'Tech Talk',
  category: 'Conférence',
  place: 'Amphi A',
  time: '2026-06-10T14:00:00Z',
  capacity: 100,
  description: 'desc',
  bannerUrl: 'https://example.com/x.jpg',
}

const renderCard = (props = {}, eventOverrides = {}) =>
  render(
    <MemoryRouter>
      <EventCard event={{ ...event, ...eventOverrides }} to="/events/e1" {...props} />
    </MemoryRouter>,
  )

describe('EventCard', () => {
  beforeEach(() => {
    toggleFavorite.mockClear()
    login.mockClear()
    favorite = false
    authed = true
  })

  it('sends a guest to login instead of opening the event', () => {
    authed = false
    renderCard()
    fireEvent.click(screen.getByText('Tech Talk'))
    expect(login).toHaveBeenCalled()
  })

  it('sends a guest to login instead of toggling favourite', () => {
    authed = false
    renderCard()
    fireEvent.click(screen.getByLabelText('Ajouter aux favoris'))
    expect(login).toHaveBeenCalled()
    expect(toggleFavorite).not.toHaveBeenCalled()
  })

  it('renders the cover image, title, place and category', () => {
    renderCard()
    expect(screen.getByText('Tech Talk')).toBeInTheDocument()
    expect(screen.getByText('Conférence')).toBeInTheDocument()
    expect(screen.getByText(/Amphi A/)).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute('src', event.bannerUrl)
  })

  it('falls back to an emoji placeholder when there is no image', () => {
    renderCard({}, { bannerUrl: null, imageUrl: null })
    expect(screen.getByText('🗓')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('toggles favourite (without navigating) when the heart is clicked', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter aux favoris' }))
    expect(toggleFavorite).toHaveBeenCalledWith('e1')
  })

  it('shows the "remove" label when the event is already a favourite', () => {
    favorite = true
    renderCard()
    expect(screen.getByRole('button', { name: 'Retirer des favoris' })).toBeInTheDocument()
  })

  it('hides the favourite button when showFavorite is false', () => {
    renderCard({ showFavorite: false })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as a plain container (no link) when "to" is not provided', () => {
    render(
      <MemoryRouter>
        <EventCard event={event} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Tech Talk')).toBeInTheDocument()
  })
})
