// src/App.jsx
import { Route, Routes } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import MainLayout from './layouts/MainLayout'
import EventCreatePage from './pages/EventCreatePage'
import EventDetailPage from './pages/EventDetailPage'
import EventEditPage from './pages/EventEditPage'
import NotificationsPage from './pages/NotificationsPage'
import OrganizerProfilePage from './pages/OrganizerProfilePage'
import RegisterPage from './pages/RegisterPage'
import { PublicOnlyRoute, RequireAuthRoute, RequireRoleRoute } from './routes/AuthRouteWrappers'

function App() {
  return (
    <AppProvider>
      <Routes>
        {/* Route publique hors layout */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div className="p-10 text-center">Page de Login</div>
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        {/* Routes privées avec Sidebar/Navbar */}
        <Route
          element={
            <RequireAuthRoute>
              <MainLayout />
            </RequireAuthRoute>
          }
        >
          <Route path="/" element={<div>Bienvenue sur UNIGEvents !</div>} />
          <Route path="/profile" element={<div>Mon Profil (Ticket PINFO-29)</div>} />
          <Route path="/my-events" element={<div>Mes Inscriptions / Événements</div>} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route
            path="/events/create"
            element={
              <RequireRoleRoute allowedRoles={['ORGANIZER']}>
                <EventCreatePage />
              </RequireRoleRoute>
            }
          />
          <Route
            path="/events/edit/:id"
            element={
              <RequireRoleRoute allowedRoles={['ORGANIZER']}>
                <EventEditPage />
              </RequireRoleRoute>
            }
          />
        </Route>

        <Route path="*" element={<div className="p-10 text-center">Page introuvable</div>} />
      </Routes>
    </AppProvider>
  )
}

export default App
