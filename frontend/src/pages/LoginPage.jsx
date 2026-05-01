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

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect()
    }
  }, [isLoading, isAuthenticated, loginWithRedirect])

  return (
    <div className="p-10 text-center">
      Redirection vers la page de connexion…
    </div>
  )
}
