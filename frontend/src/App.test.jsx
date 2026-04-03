/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import App from './App'
import { AppProvider } from './contexts/AppContext'

// On mock le hook useApp pour contrôler le rôle de l'utilisateur
vi.mock('./contexts/useApp', () => ({
  useApp: vi.fn(),
}))

import { useApp } from './contexts/useApp'

describe('Sécurité du Routage (Ticket 22)', () => {
  it('doit rediriger un STUDENT vers l’accueil s’il tente d’accéder à /events/create', () => {
    useApp.mockReturnValue({
      userRole: 'STUDENT',
      display_name: 'Jean Étudiant',
    })

    render(
      <AppProvider>
        <MemoryRouter initialEntries={['/events/create']}>
          <App />
        </MemoryRouter>
      </AppProvider>,
    )

    // Vérifie que le contenu de la page d'accueil est bien présent
    expect(screen.getByText(/Bienvenue sur UNIGEvents !/i)).toBeInTheDocument()
  })

  it('doit autoriser un ORGANIZER à accéder à /events/create', () => {
    useApp.mockReturnValue({
      userRole: 'ORGANIZER',
      display_name: 'Asso Alpha',
    })

    render(
      <AppProvider>
        <MemoryRouter initialEntries={['/events/create']}>
          <App />
        </MemoryRouter>
      </AppProvider>,
    )

    // On vérifie que la page n'est plus la page d'accueil
    expect(screen.queryByText(/Bienvenue sur UNIGEvents !/i)).not.toBeInTheDocument()
  })
})
