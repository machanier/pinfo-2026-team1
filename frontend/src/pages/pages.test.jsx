import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
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

// ---------------------------------------------------------------------------
// Mock useNotifications so NotificationsPage tests don't need a live backend
// ---------------------------------------------------------------------------
const { useNotificationsMock, useNotificationPreferencesMock } = vi.hoisted(() => ({
  useNotificationsMock: vi.fn(),
  useNotificationPreferencesMock: vi.fn(),
}))

vi.mock('../hooks/useNotifications', () => ({
  useUnreadCount: () => ({ data: 0 }),
  useNotifications: () => useNotificationsMock(),
  useNotificationPreferences: () => useNotificationPreferencesMock(),
}))

// Default mock values used across most tests
const defaultNotificationsHook = {
  data: null,
  isLoading: false,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  isMarkingAllRead: false,
}

const defaultPrefsHook = {
  data: {
    emailEnabled: true,
    emailOnAnnouncement: true,
    emailOnEventUpdate: false,
    emailOnEventCancellation: true,
    emailOnRegistrationConfirmed: true,
    emailOnFreeSlot: false,
    reminderLeadTimeHours: 24,
  },
  isLoading: false,
  error: null,
  update: vi.fn(),
  isUpdating: false,
}

describe('Pages', () => {
  beforeEach(() => {
    useNotificationsMock.mockReturnValue(defaultNotificationsHook)
    useNotificationPreferencesMock.mockReturnValue(defaultPrefsHook)
  })

  it('renders NotificationsPage heading and subtitle', () => {
    renderWithProviders(<NotificationsPage />)

    expect(screen.getByRole('heading', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByText(/Tes alertes et annonces récentes/i)).toBeInTheDocument()
  })

  it('renders NotificationsPage filter tabs', () => {
    renderWithProviders(<NotificationsPage />)

    expect(screen.getByRole('button', { name: 'Toutes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non lues' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lues' })).toBeInTheDocument()
  })

  it('renders empty state when no notifications', () => {
    renderWithProviders(<NotificationsPage />)

    expect(screen.getByText(/Tu n'as aucune notification/i)).toBeInTheDocument()
  })

  it('shows an error state when the backend fails', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      isError: true,
      data: undefined,
    })

    renderWithProviders(<NotificationsPage />)

    expect(screen.getByText(/Impossible de charger tes notifications/i)).toBeInTheDocument()
  })

  it('renders notification items from hook data', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      data: {
        content: [
          {
            notificationId: 'test-1',
            type: 'REGISTRATION_CONFIRMED',
            body: 'Ta place est confirmée.',
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            notificationId: 'test-2',
            type: 'REMINDER',
            body: 'Rappel : événement dans 24 h.',
            read: true,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 2,
      },
    })

    renderWithProviders(<NotificationsPage />)

    expect(screen.getByText(/Ta place est confirmée/i)).toBeInTheDocument()
    expect(screen.getByText(/Rappel : événement dans 24 h/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tout marquer comme lu/i })).toBeInTheDocument()
  })

  it('marks an unread notification as read via its button', () => {
    const markRead = vi.fn()
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      markRead,
      data: {
        content: [
          {
            notificationId: 'notif-42',
            type: 'ANNOUNCEMENT',
            body: 'Nouvelle annonce.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)

    // "Marquer comme lu" (per-card) is distinct from "Tout marquer comme lu".
    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme lu' }))
    expect(markRead).toHaveBeenCalledWith('notif-42')
  })

  it('links an event notification to its event and marks it read on click', () => {
    const markRead = vi.fn()
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      markRead,
      data: {
        content: [
          {
            notificationId: 'notif-7',
            eventId: 'evt-99',
            type: 'EVENT_UPDATED',
            body: 'Changement de salle.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)

    const link = screen.getByRole('link', { name: /Changement de salle/i })
    expect(link).toHaveAttribute('href', '/events/evt-99')
    fireEvent.click(link)
    expect(markRead).toHaveBeenCalledWith('notif-7')
  })

  it('calls markAllRead when "Tout marquer comme lu" is clicked', () => {
    const markAllRead = vi.fn()
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      markAllRead,
      data: {
        content: [
          {
            notificationId: 'notif-1',
            type: 'REMINDER',
            body: 'Rappel.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)

    fireEvent.click(screen.getByRole('button', { name: /Tout marquer comme lu/i }))
    expect(markAllRead).toHaveBeenCalledTimes(1)
  })

  it('points the settings button to the preferences page', () => {
    renderWithProviders(<NotificationsPage />)

    const settingsLink = screen.getByRole('link', { name: /Préférences de notification/i })
    expect(settingsLink).toHaveAttribute('href', '/notifications/preferences')
  })

  it('shows empty state for filtered view with no results', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      data: {
        content: [],
        unreadCount: 0,
        page: 0,
        totalPages: 1,
        totalElements: 0,
      },
    })

    renderWithProviders(<NotificationsPage />)

    // Switch to "Non lues" tab to trigger filtered empty state
    fireEvent.click(screen.getByRole('button', { name: /Non lues/i }))
    expect(screen.getByText(/Aucune notification dans cette catégorie/i)).toBeInTheDocument()
  })

  it('shows spinner on "Tout marquer comme lu" when isMarkingAllRead is true', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      isMarkingAllRead: true,
      data: {
        content: [
          {
            notificationId: 'n1',
            type: 'REMINDER',
            body: 'Test.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)

    expect(screen.getByRole('button', { name: /Tout marquer comme lu/i })).toBeDisabled()
  })

  it('does not call markRead when clicking a read notification', () => {
    const markRead = vi.fn()
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      markRead,
      data: {
        content: [
          {
            notificationId: 'notif-read',
            type: 'REMINDER',
            body: 'Notification déjà lue.',
            read: true,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 0,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)
    fireEvent.click(screen.getByText(/Notification déjà lue/i))
    expect(markRead).not.toHaveBeenCalled()
  })

  it('shows pagination footer when totalPages > 1', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      data: {
        content: [
          {
            notificationId: 'n1',
            type: 'REMINDER',
            body: 'Test.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 3,
        totalElements: 90,
      },
    })

    renderWithProviders(<NotificationsPage />)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /page suivante/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /page précédente/i })).toBeInTheDocument()
  })

  it('falls back to REMINDER meta for an unknown notification type', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      data: {
        content: [
          {
            notificationId: 'n-unknown',
            type: 'UNKNOWN_TYPE',
            body: 'Type inconnu.',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)
    expect(screen.getByText(/Type inconnu/i)).toBeInTheDocument()
    expect(screen.getByText('Rappel')).toBeInTheDocument()
  })

  it('renders notification without crash when createdAt is null', () => {
    useNotificationsMock.mockReturnValue({
      ...defaultNotificationsHook,
      data: {
        content: [
          {
            notificationId: 'n-no-time',
            type: 'REMINDER',
            body: 'Sans horodatage.',
            read: false,
            createdAt: null,
          },
        ],
        unreadCount: 1,
        page: 0,
        totalPages: 1,
        totalElements: 1,
      },
    })

    renderWithProviders(<NotificationsPage />)
    expect(screen.getByText(/Sans horodatage/i)).toBeInTheDocument()
  })

  it('renders OrganizerProfilePage heading', async () => {
    // OrganizerProfilePage now fetches real data (events + profile) via
    // react-query, so it needs a QueryClientProvider. The static h1 renders
    // regardless of the query outcome; mock axios to resolve an empty page.
    mockedAxios.create().get.mockResolvedValue({ data: { content: [] } })

    renderWithProviders(
      <Routes>
        <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
      </Routes>,
      { initialEntries: ['/organizers/7'] },
    )

    expect(
      await screen.findByRole('heading', { name: /Profil organisateur/i }),
    ).toBeInTheDocument()
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
