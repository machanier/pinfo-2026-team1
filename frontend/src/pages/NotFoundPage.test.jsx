/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import NotFoundPage from './NotFoundPage'

describe('NotFoundPage', () => {
  it('renders the 404 message and home link', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Cette page n'a pas l'air d'exister/i)).toBeInTheDocument()
    const homeLink = screen.getByRole('link', { name: /Retour à l'accueil/i })
    expect(homeLink).toHaveAttribute('href', '/')
    expect(screen.getByText(/Error code 404/i)).toBeInTheDocument()
  })
})
