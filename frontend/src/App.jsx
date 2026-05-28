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
import OrganizerProfilePage from './pages/OrganizerProfilePage'
import ProfilePage from './pages/ProfilePage'
import MyEventsPage from './pages/MyEventsPage'
import EventsPage from './pages/EventsPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import AboutPage from './pages/AboutPage'
import HelpPage from './pages/HelpPage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
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

          {/* Routes publiques — navigables sans connexion (visiteur anonyme).
              MainLayout sans RequireAuthRoute : un visiteur peut parcourir
              l'accueil, la recherche, les fiches d'événements et les pages
              d'information. La connexion n'est requise que pour s'inscrire. */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/aide" element={<HelpPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
          </Route>

          {/* Routes privées — connexion requise (espace perso + édition). */}
          <Route
            element={
              <RequireAuthRoute>
                <MainLayout />
              </RequireAuthRoute>
            }
          >
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
