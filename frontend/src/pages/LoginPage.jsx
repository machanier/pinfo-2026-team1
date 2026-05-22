// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader, AlertCircle } from 'lucide-react'
import { fetchEvents } from '../lib/apiServices'
import EventCard from '../components/event/EventCard'
import Footer from '../components/layout/Footer'
import { SAMPLE_EVENTS } from '../lib/sampleEvents'
import { DEMO_MODE } from '../lib/demoMode'

const isDev = import.meta.env.DEV

function GoogleIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0()

  const returnTo = location.state?.returnTo ?? '/profile'
  const [isProcessing, setIsProcessing] = useState(false)

  const [eventsPage, setEventsPage] = useState(0)
  const PAGE_SIZE = 12
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['publicEvents', eventsPage],
    queryFn: () => fetchEvents({ status: 'PUBLISHED', page: eventsPage, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const realEvents = eventsData?.content ?? []
  const events = realEvents.length === 0 && DEMO_MODE ? SAMPLE_EVENTS : realEvents
  const totalPages = eventsData?.totalPages ?? 0

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (isDev) console.log('[LoginPage] Déjà authentifié, redirection vers', returnTo)
      navigate(returnTo, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, returnTo])

  const startLogin = async (extraParams = {}) => {
    try {
      setIsProcessing(true)
      await loginWithRedirect({
        appState: { returnTo },
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
          ...extraParams,
        },
      })
    } catch (err) {
      console.error('[LoginPage] Erreur auth:', err)
      setIsProcessing(false)
    }
  }

  const handleLogin = () => startLogin()
  const handleSignup = () => startLogin({ screen_hint: 'signup' })
  // Requires the Google social connection to be enabled on the Auth0 tenant.
  const handleGoogle = () => startLogin({ connection: 'google-oauth2' })

  const authError = error
    ? error.error_description || error.message || "Erreur d'authentification"
    : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader className="h-7 w-7 animate-spin text-pink-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="bg-pink-600 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-pink-200 text-sm font-medium uppercase tracking-widest mb-3">
            UNIGEvents
          </p>
          <h1 className="text-4xl font-bold mb-3">Événements universitaires</h1>
          <p className="text-pink-100 text-base mb-8">
            Découvrez les prochains événements de votre université et inscrivez-vous en un clic.
          </p>

          {authError && (
            <div className="flex items-center gap-2 mb-4 text-sm bg-red-500/20 border border-red-300/30 text-white rounded-lg px-4 py-2 w-fit">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {authError}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleLogin}
              disabled={isProcessing}
              className="px-6 py-3 bg-white text-pink-600 font-semibold rounded-xl hover:bg-pink-50 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
            >
              {isProcessing && <Loader className="h-4 w-4 animate-spin" />}
              Se connecter
            </button>
            <button
              onClick={handleSignup}
              disabled={isProcessing}
              className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-xl border border-white/20 hover:bg-pink-400 disabled:opacity-50 transition"
            >
              Créer un compte
            </button>
            <button
              onClick={handleGoogle}
              disabled={isProcessing}
              className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
            >
              <GoogleIcon className="h-5 w-5" />
              Continuer avec Google
            </button>
          </div>
        </div>
      </div>

      {/* ── Événements ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {eventsLoading && events.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl bg-white border border-gray-100 animate-pulse shadow-sm"
              >
                <div className="h-40 w-full bg-gray-100" />
                <div className="space-y-2 p-4">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {eventsError && events.length === 0 && (
          <p className="text-red-500 text-sm">Impossible de charger les événements.</p>
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <p className="text-gray-400 text-sm">Aucun événement publié pour le moment.</p>
        )}

        {events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <EventCard
                key={event.eventId}
                event={event}
                to={`/events/${event.eventId}`}
                showFavorite={false}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
            <button
              onClick={() => setEventsPage((p) => Math.max(0, p - 1))}
              disabled={eventsPage === 0}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition"
            >
              ← Précédent
            </button>
            <span className="text-sm text-gray-400">
              {eventsPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setEventsPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={eventsPage >= totalPages - 1}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition"
            >
              Suivant →
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
