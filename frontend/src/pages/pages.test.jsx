import { fireEvent, render, screen } from '@testing-library/react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import EventCreatePage from './EventCreatePage'
import EventDetailPage from './EventDetailPage'
import EventEditPage from './EventEditPage'
import EditProfilePage from './EditProfilePage'
import NotificationsPage from './NotificationsPage'
import OrganizerProfilePage from './OrganizerProfilePage'
import ProfilePage from './ProfilePage'
import RegisterPage from './RegisterPage'

vi.mock('axios', () => {
  const get = vi.fn()
  const post = vi.fn()
  const put = vi.fn()

  return {
    default: {
      create: () => ({
        get,
        post,
        put,
        interceptors: {
          request: {
            use: vi.fn(),
          },
        },
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
  currentUserId: 'orga-ctx-1',
  setCurrentUserId: () => {},
  authToken: 'token',
  setAuthToken: () => {},
}

const studentContext = {
  userRole: 'STUDENT',
  setUserRole: () => {},
  displayName: 'Alice Etudiante',
  setDisplayName: () => {},
  savedEvents: [],
  setSavedEvents: () => {},
  currentUserId: 'student-ctx-1',
  setCurrentUserId: () => {},
  authToken: 'token',
  setAuthToken: () => {},
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

    fireEvent.submit(screen.getByRole('button', { name: /Créer mon compte/i }).closest('form'))
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

    fireEvent.submit(screen.getByRole('button', { name: /Publier l'événement/i }).closest('form'))
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

    fireEvent.submit(screen.getByRole('button', { name: /Enregistrer/i }).closest('form'))
  })
})
