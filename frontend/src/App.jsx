// src/App.jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { useApp } from './contexts/useApp'
import MainLayout from './layouts/MainLayout'
import EventCreatePage from './pages/EventCreatePage'
import EventDetailPage from './pages/EventDetailPage'
import EventEditPage from './pages/EventEditPage'
import NotificationsPage from './pages/NotificationsPage'
import OrganizerProfilePage from './pages/OrganizerProfilePage'
import RegisterPage from './pages/RegisterPage'

function OrganizerOnlyRoute({ children }) {
  const { userRole } = useApp()

  if (userRole !== 'ORGANIZER') {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <AppProvider>
      <Routes>
        {/* Route publique hors layout */}
        <Route path="/login" element={<div className="p-10 text-center">Page de Login</div>} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Routes privées avec Sidebar/Navbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<div>Bienvenue sur UNIGEvents !</div>} />
          <Route path="/profile" element={<div>Mon Profil (Ticket PINFO-29)</div>} />
          <Route path="/my-events" element={<div>Mes Inscriptions / Événements</div>} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route
            path="/events/create"
            element={
              <OrganizerOnlyRoute>
                <EventCreatePage />
              </OrganizerOnlyRoute>
            }
          />
          <Route
            path="/events/edit/:id"
            element={
              <OrganizerOnlyRoute>
                <EventEditPage />
              </OrganizerOnlyRoute>
            }
          />
        </Route>

        <Route path="*" element={<div className="p-10 text-center">Page introuvable</div>} />
      </Routes>
    </AppProvider>
  )
}

export default App
