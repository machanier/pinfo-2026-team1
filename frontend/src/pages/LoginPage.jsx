// src/pages/LoginPage.jsx
/**
 * Page de connexion utilisant Auth0
 *
 * Cette page affiche un bouton pour se connecter via Auth0.
 * Après authentification réussie, Auth0 redirige l'utilisateur vers
 * l'application avec un token JWT valide.
 *
 * Flux d'authentification:
 * 1. Utilisateur clique sur "Se connecter avec Auth0"
 * 2. Redirigé vers la page Auth0
 * 3. L'utilisateur s'authentifie
 * 4. Auth0 redirige vers l'application avec le code d'autorisation
 * 5. La librairie auth0-react échange le code pour un token JWT
 * 6. L'AppContext utilise ce token pour les appels API sécurisés
 */

import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Loader, AlertCircle, CheckCircle } from 'lucide-react'

const isDev = import.meta.env.DEV

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { loginWithRedirect, isLoading, error, isAuthenticated } = useAuth0()

  // Destination the guard stored before sending the user to /login.
  // Forwarded to Auth0 as appState.returnTo so onRedirectCallback
  // (Auth0ProviderWithConfig) can navigate there after the callback.
  const returnTo = location.state?.returnTo ?? '/profile'

  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success', 'error', 'info'
  const codeParam = searchParams.get('code')
  const stateParam = searchParams.get('state')

  const auth0Feedback = (() => {
    if (error) {
      return {
        type: 'error',
        message: `Erreur: ${error.error_description || error.message || "Erreur d'authentification"}`,
      }
    }

    if (codeParam && stateParam) {
      return {
        type: 'info',
        message: 'Traitement de votre authentification...',
      }
    }

    if (isAuthenticated && !isLoading) {
      return {
        type: 'success',
        message: 'Authentification réussie ! Redirection...',
      }
    }

    return null
  })()

  /**
   * After a successful Auth0 callback, Auth0ProviderWithConfig handles
   * the redirect via onRedirectCallback. If the user arrives on /login
   * already authenticated (e.g. direct navigation), send them away.
   */
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (isDev) {
        console.log('[LoginPage] Déjà authentifié, redirection vers', returnTo)
      }
      navigate(returnTo, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, returnTo])

  /**
   * Déclenche le flux de connexion Auth0
   */
  const handleLoginWithAuth0 = async () => {
    try {
      setIsProcessing(true)
      setMessage('')

      if (isDev) {
        console.log('[LoginPage] Déclenchement du login Auth0...')
      }

      await loginWithRedirect({
        appState: { returnTo },
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
        },
      })
    } catch (err) {
      console.error('[LoginPage] Erreur lors de la connexion:', err)
      setMessageType('error')
      setMessage('Erreur lors de la connexion. Veuillez réessayer.')
      setIsProcessing(false)
    }
  }

  const handleSignupWithAuth0 = async () => {
    try {
      setIsProcessing(true)
      setMessage('')

      if (isDev) {
        console.log('[LoginPage] Déclenchement de l’inscription Auth0...')
      }

      await loginWithRedirect({
        appState: { returnTo },
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: 'openid profile email',
          screen_hint: 'signup',
        },
      })
    } catch (err) {
      console.error('[LoginPage] Erreur lors de l’inscription:', err)
      setMessageType('error')
      setMessage('Impossible d’ouvrir l’inscription Auth0. Veuillez réessayer.')
      setIsProcessing(false)
    }
  }

  /**
   * Afficher un spinner pendant le chargement initial
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">UnigEvents</h1>
          <p className="mt-2 text-gray-600">Connectez-vous pour accéder au site.</p>
        </div>

        {/* Messages */}
        {(message || auth0Feedback) && (
          <div
            className={`flex items-center gap-3 rounded-md p-4 ${
              (messageType || auth0Feedback?.type) === 'success'
                ? 'bg-green-50 text-green-700'
                : (messageType || auth0Feedback?.type) === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {(messageType || auth0Feedback?.type) === 'success' && (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            )}
            {(messageType || auth0Feedback?.type) === 'error' && (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            {(messageType || auth0Feedback?.type) === 'info' && (
              <Loader className="h-5 w-5 animate-spin flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message || auth0Feedback?.message}</p>
          </div>
        )}

        {/* Contenu Principal */}
        <div className="space-y-6">
          {/* Bouton Auth0 */}
          <button
            onClick={handleLoginWithAuth0}
            disabled={isProcessing || isLoading}
            className="w-full rounded-md bg-pink-600 px-4 py-3 text-white font-medium hover:bg-pink-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Redirection vers Auth0...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  {/* Logo Auth0 simplifié */}
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
                Se connecter avec Auth0
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gradient-to-br from-pink-50 to-blue-50 px-2 text-gray-500">
                Informations supplémentaires
              </span>
            </div>
          </div>

          {/* Information panels */}
          <div className="space-y-3">
            <div className="rounded-md bg-blue-50 p-4">
              <h3 className="font-medium text-blue-900 mb-2">À propos d'Auth0</h3>
              <p className="text-sm text-blue-700">
                Nous utilisons Auth0 pour sécuriser votre authentification. Votre mot de passe n'est
                jamais partagé avec notre application.
              </p>
            </div>

            <div className="rounded-md bg-gray-50 p-4">
              <h3 className="font-medium text-gray-900 mb-2">Pas encore de compte ?</h3>
              <p className="text-sm text-gray-700 mb-3">
                La création de compte se fait directement via Auth0, sans page d’inscription locale.
              </p>
              <button
                onClick={handleSignupWithAuth0}
                disabled={isProcessing || isLoading}
                className="text-sm font-medium text-pink-600 hover:text-pink-700 underline"
              >
                Créer un compte avec Auth0
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            En vous connectant, vous acceptez nos{' '}
            <button className="font-medium text-pink-600 hover:text-pink-700 underline">
              conditions d'utilisation
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
