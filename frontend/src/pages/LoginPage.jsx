// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Loader, AlertCircle } from 'lucide-react'
import { fetchEvents } from '../lib/apiServices'

const isDev = import.meta.env.DEV

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0()

  const returnTo = location.state?.returnTo ?? '/profile'
  const [isProcessing, setIsProcessing] = useState(false)
  const codeParam = searchParams.get('code')
  const stateParam = searchParams.get('state')

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
  const events = eventsData?.content ?? []
  const totalPages = eventsData?.totalPages ?? 0

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (isDev) console.log('[LoginPage] Déjà authentifié, redirection vers', returnTo)
      navigate(returnTo, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, returnTo])

  const handleLogin = async () => {
    try {
      setIsProcessing(true)
      await loginWithRedirect({
        appState: { returnTo },
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
        },
      })
    } catch (err) {
      console.error('[LoginPage] Erreur login:', err)
      setIsProcessing(false)
    }
  }

  const handleSignup = async () => {
    try {
      setIsProcessing(true)
      await loginWithRedirect({
        appState: { returnTo },
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
          screen_hint: 'signup',
        },
      })
    } catch (err) {
      console.error('[LoginPage] Erreur inscription:', err)
      setIsProcessing(false)
    }
  }

  const authError = error
    ? error.error_description || error.message || "Erreur d'authentification"
    : codeParam && stateParam
      ? null // processing, handled by redirect
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
            UnigEvents
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
          </div>
        </div>
      </div>

      {/* ── Événements ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {eventsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white border border-gray-100 p-5 animate-pulse shadow-sm"
              >
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {eventsError && (
          <p className="text-red-500 text-sm">Impossible de charger les événements.</p>
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <p className="text-gray-400 text-sm">Aucun événement publié pour le moment.</p>
        )}

        {!eventsLoading && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <div
                key={event.eventId}
                className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                    {event.title}
                  </h2>
                  {event.category && (
                    <span className="shrink-0 text-xs font-medium bg-pink-50 text-pink-600 rounded-full px-2 py-0.5">
                      {event.category}
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-400 space-y-1">
                  {event.time && (
                    <p>
                      🗓{' '}
                      {new Date(event.time).toLocaleDateString('fr-CH', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {event.place && <p>📍 {event.place}</p>}
                  {event.capacity && <p>👥 {event.capacity} places</p>}
                </div>

                {event.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
                )}

                <button
                  onClick={handleLogin}
                  disabled={isProcessing}
                  className="mt-auto text-xs font-medium text-pink-600 hover:text-pink-700 disabled:opacity-50 text-left"
                >
                  Se connecter pour accéder à l&apos;événement →
                </button>
              </div>
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
    </div>
  )
}
