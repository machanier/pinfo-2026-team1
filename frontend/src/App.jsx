// src/App.jsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import NotFoundPage from './pages/NotFoundPage'
import ErrorBoundary from './components/ErrorBoundary'
import MainLayout from './layouts/MainLayout'
import EventCreatePage from './pages/EventCreatePage'
import EventDetailPage from './pages/EventDetailPage'
import EventEditPage from './pages/EventEditPage'
import EditProfilePage from './pages/EditProfilePage'
import LoginPage from './pages/LoginPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import MyEventsPage from './pages/MyEventsPage'
import EventsPage from './pages/EventsPage'
import CalendarPage from './pages/CalendarPage'
import { PublicOnlyRoute, RequireAuthRoute, RequireRoleRoute } from './routes/AuthRouteWrappers'

// PINFO-190 — Auth0Provider must wrap AppProvider because AppProvider
// calls useAuth0() to expose isAuthenticated / role / displayName via
// the app context. ErrorBoundary stays at the top so a crash in
// Auth0Provider initialization (missing env vars) renders a friendly
// fallback instead of a white screen.
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Routes>
          {/* Route publique hors layout */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute redirectTo="/">
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          {/* Routes privées avec Sidebar/Navbar — RequireAuthRoute redirige vers
              /login les visiteurs non connectés (la LoginPage affiche
              la liste des événements pour les visiteurs). */}
          <Route
            element={
              <RequireAuthRoute>
                <MainLayout />
              </RequireAuthRoute>
            }
          >
            <Route path="/" element={<EventsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/profile/:id/edit" element={<EditProfilePage />} />
            <Route path="/my-events" element={<MyEventsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route
              path="/events/create"
              element={
                <RequireRoleRoute allowedRoles={['ORGANIZER', 'ADMIN']} redirectTo="/">
                  <EventCreatePage />
                </RequireRoleRoute>
              }
            />
            <Route
              path="/events/edit/:id"
              element={
                <RequireRoleRoute allowedRoles={['ORGANIZER', 'ADMIN']} redirectTo="/">
                  <EventEditPage />
                </RequireRoleRoute>
              }
            />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/organizers/:id" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/events" element={<Navigate to="/my-events" replace />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
