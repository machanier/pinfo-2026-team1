import { fireEvent, render, screen } from '@testing-library/react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import EventCreatePage from './EventCreatePage'
import EventDetailPage from './EventDetailPage'
import EventEditPage from './EventEditPage'
import NotificationsPage from './NotificationsPage'
import OrganizerProfilePage from './OrganizerProfilePage'
import ProfilePage from './ProfilePage'
import RegisterPage from './RegisterPage'

vi.mock('axios', () => {
  const get = vi.fn()
  const post = vi.fn()

  return {
    default: {
      create: () => ({
        get,
        post,
      }),
    },
  }
})

const organizerContext = {
  userRole: 'ORGANIZER',
  setUserRole: () => {},
  displayName: 'Asso Alpha',
  setDisplayName: () => {},
  savedEvents: [],
  setSavedEvents: () => {},
}

const studentContext = {
  userRole: 'STUDENT',
  setUserRole: () => {},
  displayName: 'Alice Etudiante',
  setDisplayName: () => {},
  savedEvents: [],
  setSavedEvents: () => {},
}

const mockedAxios = axios

function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Pages', () => {
  it('renders EventDetailPage with route id', () => {
    render(
      <MemoryRouter initialEntries={['/events/42']}>
        <Routes>
          <Route path="/events/:id" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Détails de l'événement #42/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /S'abonner/i })).toBeInTheDocument()
  })

  it('renders NotificationsPage content', () => {
    render(<NotificationsPage />)

    expect(screen.getByRole('heading', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByText(/Nouvelles activités publiées cette semaine/i)).toBeInTheDocument()
  })

  it('renders OrganizerProfilePage links', () => {
    render(
      <MemoryRouter initialEntries={['/organizers/7']}>
        <Routes>
          <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Profil organisateur #7/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Voir/i })).toHaveLength(3)
  })

  it('toggles RegisterPage student/organizer fields', () => {
    render(<RegisterPage />)

    expect(screen.getByLabelText(/Filière/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Organizer/i }))
    expect(screen.getByLabelText(/Nom de l'organisation/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Student/i }))
    expect(screen.getByLabelText(/Filière/i)).toBeInTheDocument()
  })

  it('submits RegisterPage form without navigation', () => {
    render(<RegisterPage />)

    const submitButton = screen.getByRole('button', { name: /Créer mon compte/i })
    const form = submitButton.closest('form')

    expect(form).not.toBeNull()
    fireEvent.submit(form)
    expect(screen.getByRole('heading', { name: /Inscription/i })).toBeInTheDocument()
  })

  it('renders EventCreatePage for ORGANIZER', () => {
    render(
      <AppContext.Provider value={organizerContext}>
        <MemoryRouter initialEntries={['/events/create']}>
          <Routes>
            <Route path="/events/create" element={<EventCreatePage />} />
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    expect(screen.getByText(/Création d'un événement/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publier l'événement/i })).toBeInTheDocument()
  })

  it('submits EventCreatePage form without navigation', () => {
    render(
      <MemoryRouter initialEntries={['/events/create']}>
        <Routes>
          <Route path="/events/create" element={<EventCreatePage />} />
        </Routes>
      </MemoryRouter>,
    )

    const submitButton = screen.getByRole('button', { name: /Publier l'événement/i })
    const form = submitButton.closest('form')

    expect(form).not.toBeNull()
    fireEvent.submit(form)
    expect(screen.getByText(/Formulaire réservé aux organisateurs/i)).toBeInTheDocument()
  })

  it('renders EventEditPage for ORGANIZER', () => {
    render(
      <AppContext.Provider value={organizerContext}>
        <MemoryRouter initialEntries={['/events/edit/99']}>
          <Routes>
            <Route path="/events/edit/:id" element={<EventEditPage />} />
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    expect(screen.getByText(/Édition événement #99/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument()
  })

  it('submits EventEditPage form without navigation', () => {
    render(
      <MemoryRouter initialEntries={['/events/edit/99']}>
        <Routes>
          <Route path="/events/edit/:id" element={<EventEditPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const submitButton = screen.getByRole('button', { name: /Enregistrer/i })
    const form = submitButton.closest('form')

    expect(form).not.toBeNull()
    fireEvent.submit(form)
    expect(screen.getByText(/Mise à jour des informations/i)).toBeInTheDocument()
  })

  it('renders ProfilePage student public fields', async () => {
    mockedAxios.create().get.mockRejectedValueOnce(new Error('API unavailable'))

    renderWithProviders(
      <AppContext.Provider value={studentContext}>
        <Routes>
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </AppContext.Provider>,
      { initialEntries: ['/profile/user-student-1'] },
    )

    expect(await screen.findByText(/Profil Utilisateur/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Etudiant/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Universite/i)).toBeInTheDocument()
    expect(screen.getByText(/Informatique/i)).toBeInTheDocument()
    expect(screen.getByText(/Annee/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /S'abonner/i })).not.toBeInTheDocument()
  })

  it('renders ProfilePage organizer public fields and follow button', async () => {
    mockedAxios.create().get.mockRejectedValueOnce(new Error('API unavailable'))

    renderWithProviders(
      <AppContext.Provider value={organizerContext}>
        <Routes>
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </AppContext.Provider>,
      { initialEntries: ['/profile/orga-1'] },
    )

    expect(await screen.findByText(/Profil Utilisateur/i)).toBeInTheDocument()
    expect(screen.getByText(/Organisateur/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Association/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Site web/i)).toBeInTheDocument()
    expect(screen.getByText(/Followers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /S'abonner/i })).toBeInTheDocument()
  })
})
