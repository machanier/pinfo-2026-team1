/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'
import { AppProvider } from './contexts/AppContext'

vi.mock('./lib/apiServices', () => ({
  fetchEvents: vi.fn(() => new Promise(() => {})),
}))

// On mock le hook useApp pour contrôler le rôle de l'utilisateur
vi.mock('./contexts/useApp', () => ({
  useApp: vi.fn(),
}))

import { useApp } from './contexts/useApp'

function renderApp(path) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AppProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AppProvider>
    </QueryClientProvider>,
  )
}

describe('Sécurité du Routage (Ticket 22)', () => {
  it("doit rediriger un STUDENT vers l'accueil s'il tente d'accéder à /events/create", () => {
    useApp.mockReturnValue({
      isAuthenticated: true,
      userRole: 'STUDENT',
      displayName: 'Jean Étudiant',
    })

    renderApp('/events/create')

    // Vérifie que le contenu de la page d'accueil est bien présent
    expect(screen.getByRole('heading', { name: /Événements à venir/i })).toBeInTheDocument()
  })

  it('doit autoriser un ORGANIZER à accéder à /events/create', () => {
    useApp.mockReturnValue({
      isAuthenticated: true,
      userRole: 'ORGANIZER',
      displayName: 'Asso Alpha',
    })

    renderApp('/events/create')

    // Vérifie que la page de création d'événement est bien affichée
    expect(screen.getByRole('heading', { name: /Création d'un événement/i })).toBeInTheDocument()
  })

  it('doit rediriger depuis /login vers la page principale si connecté', () => {
    useApp.mockReturnValue({
      isAuthenticated: true,
      userRole: 'STUDENT',
      displayName: 'Jean Étudiant',
    })

    renderApp('/login')

    expect(screen.getByRole('heading', { name: /Événements à venir/i })).toBeInTheDocument()
    expect(screen.queryByText(/Page de Login/i)).not.toBeInTheDocument()
  })
})
