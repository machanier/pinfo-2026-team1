import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import EventCreatePage from './EventCreatePage'
import EventEditPage from './EventEditPage'
import NotificationsPage from './NotificationsPage'
import OrganizerProfilePage from './OrganizerProfilePage'
import ProfilePage from './ProfilePage'

vi.mock('axios', () => {
  const get = vi.fn()
  const post = vi.fn()
  const requestUse = vi.fn()

  return {
    default: {
      create: () => ({
        get,
        post,
        interceptors: {
          request: {
            use: requestUse,
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

  it('renders EventEditPage for ORGANIZER with pre-populated form', async () => {
    mockedAxios.create().get.mockResolvedValueOnce({
      data: {
        eventId: '99',
        title: 'Job Dating',
        category: 'Conférence',
        place: 'Amphi A',
        capacity: 200,
        time: '2025-09-01T09:00:00Z',
        endTime: '',
        description: 'Une description',
        tags: ['tech'],
        restrictedTo: null,
      },
    })
    renderWithProviders(
      <AppContext.Provider value={organizerContext}>
        <Routes>
          <Route path="/events/edit/:id" element={<EventEditPage />} />
        </Routes>
      </AppContext.Provider>,
      { initialEntries: ['/events/edit/99'] },
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Enregistrer les modifications/i }),
      ).toBeInTheDocument(),
    )
    expect(screen.getByDisplayValue('Job Dating')).toBeInTheDocument()
  })

  it('shows loading state then form for EventEditPage', async () => {
    mockedAxios.create().get.mockResolvedValueOnce({
      data: {
        eventId: '99',
        title: 'Test',
        category: 'Cat',
        place: 'Lieu',
        capacity: 10,
        time: '2025-09-01T09:00:00Z',
        endTime: null,
        description: 'Desc',
        tags: [],
        restrictedTo: null,
      },
    })
    renderWithProviders(
      <Routes>
        <Route path="/events/edit/:id" element={<EventEditPage />} />
      </Routes>,
      { initialEntries: ['/events/edit/99'] },
    )

    expect(screen.getByText(/Chargement/i)).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Enregistrer les modifications/i }),
      ).toBeInTheDocument(),
    )
  })

  it('renders ProfilePage error state when API is unavailable (student)', async () => {
    mockedAxios.create().get.mockRejectedValueOnce(new Error('API unavailable'))

    renderWithProviders(
      <AppContext.Provider value={studentContext}>
        <Routes>
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </AppContext.Provider>,
      { initialEntries: ['/profile/user-student-1'] },
    )

    expect(await screen.findByText(/Impossible de charger le profil/i)).toBeInTheDocument()
  })

  it('renders ProfilePage error state when API is unavailable (organizer)', async () => {
    mockedAxios.create().get.mockRejectedValueOnce(new Error('API unavailable'))

    renderWithProviders(
      <AppContext.Provider value={organizerContext}>
        <Routes>
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </AppContext.Provider>,
      { initialEntries: ['/profile/orga-1'] },
    )

    expect(await screen.findByText(/Impossible de charger le profil/i)).toBeInTheDocument()
  })
})
