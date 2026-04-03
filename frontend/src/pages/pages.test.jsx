import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppContext } from '../contexts/AppContextValue'
import EventCreatePage from './EventCreatePage'
import EventDetailPage from './EventDetailPage'
import EventEditPage from './EventEditPage'
import NotificationsPage from './NotificationsPage'
import OrganizerProfilePage from './OrganizerProfilePage'
import RegisterPage from './RegisterPage'

const organizerContext = {
  userRole: 'ORGANIZER',
  setUserRole: () => {},
  display_name: 'Asso Alpha',
  setDisplayName: () => {},
  savedEvents: [],
  setSavedEvents: () => {},
}

const studentContext = {
  userRole: 'STUDENT',
  setUserRole: () => {},
  display_name: 'Jean Etudiant',
  setDisplayName: () => {},
  savedEvents: [],
  setSavedEvents: () => {},
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

    expect(screen.getByText(/Details de l'evenement #42/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /S'abonner/i })).toBeInTheDocument()
  })

  it('renders NotificationsPage content', () => {
    render(<NotificationsPage />)

    expect(screen.getByRole('heading', { name: /Notifications/i })).toBeInTheDocument()
    expect(screen.getByText(/Nouvelles activites publiees cette semaine/i)).toBeInTheDocument()
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

    expect(screen.getByLabelText(/Filiere/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Organizer/i }))
    expect(screen.getByLabelText(/Nom de l'organisation/i)).toBeInTheDocument()
  })

  it('redirects STUDENT away from EventCreatePage', () => {
    render(
      <AppContext.Provider value={studentContext}>
        <MemoryRouter initialEntries={['/events/create']}>
          <Routes>
            <Route path="/" element={<div>Home page</div>} />
            <Route path="/events/create" element={<EventCreatePage />} />
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    expect(screen.getByText(/Home page/i)).toBeInTheDocument()
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

    expect(screen.getByText(/Creation d'un evenement/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publier l'evenement/i })).toBeInTheDocument()
  })

  it('redirects STUDENT away from EventEditPage', () => {
    render(
      <AppContext.Provider value={studentContext}>
        <MemoryRouter initialEntries={['/events/edit/99']}>
          <Routes>
            <Route path="/" element={<div>Home page</div>} />
            <Route path="/events/edit/:id" element={<EventEditPage />} />
          </Routes>
        </MemoryRouter>
      </AppContext.Provider>,
    )

    expect(screen.getByText(/Home page/i)).toBeInTheDocument()
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

    expect(screen.getByText(/Edition evenement #99/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enregistrer/i })).toBeInTheDocument()
  })
})
