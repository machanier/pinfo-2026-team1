// PINFO-190 — placeholder /login page.
//
// Triggers the Auth0 hosted-login flow as soon as the user lands here.
// Auth0 takes over the screen, then redirects back via
// Auth0ProviderWithConfig.onRedirectCallback.
//
// We don't render a sign-in form ourselves — Auth0 hosts that, with MFA
// step-up, password reset, social logins, etc. all handled there.
import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useLocation } from 'react-router-dom'

const LOGIN_REDIRECT_LOCK_KEY = 'auth0:login_redirect_started_at'
const LOGIN_REDIRECT_LOCK_TTL_MS = 15_000

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()
  const location = useLocation()

  useEffect(() => {
    if (isLoading || isAuthenticated) return

    // In React StrictMode (dev), effects run twice on mount. Without a
    // small lock, /login can trigger two back-to-back redirects, which
    // starts two Auth0 transactions and often looks like an MFA loop.
    const now = Date.now()
    const lockStartedAt = Number(sessionStorage.getItem(LOGIN_REDIRECT_LOCK_KEY) ?? '0')
    if (Number.isFinite(lockStartedAt) && now - lockStartedAt < LOGIN_REDIRECT_LOCK_TTL_MS) {
      return
    }
    sessionStorage.setItem(LOGIN_REDIRECT_LOCK_KEY, String(now))

    const returnTo = location.state?.returnTo ?? '/'
    void loginWithRedirect({ appState: { returnTo } })
  }, [isLoading, isAuthenticated, loginWithRedirect, location.state?.returnTo])

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      sessionStorage.removeItem(LOGIN_REDIRECT_LOCK_KEY)
    }
  }, [isLoading, isAuthenticated])

  return (
    <div className="p-10 text-center">
      Redirection vers la page de connexion…
    </div>
  )
}
