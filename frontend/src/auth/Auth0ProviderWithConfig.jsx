// PINFO-190 — Auth0 SPA wrapper.
//
// Pulls the three Auth0 config values from VITE_* env vars (see
// frontend/.env.example) and wires them into the official
// @auth0/auth0-react provider.
//
//   cacheLocation: 'localstorage'
//     We initially used 'memory' (the most secure option — token is
//     gone on tab close) plus useRefreshTokens to recover the session
//     across page reloads via silent auth. That works in theory but
//     requires Refresh Token Rotation to be explicitly enabled on the
//     dashboard side, with a Maximum Refresh Token Lifetime, AND
//     functional third-party-cookie / iframe-based silent auth — three
//     moving parts that are very easy to get wrong, and the failure
//     mode is "infinite redirect loop after MFA succeeds" which is
//     terrible UX. localstorage trades a small XSS surface (a future
//     XSS bug could read the access token) against a setup that just
//     works regardless of the dashboard refresh-token settings. The
//     CSP we ship (PINFO-188) already restricts script-src to 'self',
//     so an XSS would have to come from our own bundle to be useful —
//     not a free lunch but an acceptable trade.
//
//   authorizationParams.audience
//     Required for Auth0 to issue an *access* token (not just an id
//     token) bound to our API. Backend Quarkus services validate this
//     audience via mp.jwt.verify.audiences.
//
//   authorizationParams.scope
//     'openid profile email' — standard OIDC scopes. We dropped
//     offline_access because we no longer need refresh tokens (the
//     access token in localstorage survives reloads).

import { Auth0Provider } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

export function Auth0ProviderWithConfig({ children }) {
  const navigate = useNavigate()

  // Fail loud at boot rather than silently letting users in unauthenticated.
  if (!domain || !clientId || !audience) {
    throw new Error(
      'Auth0 misconfigured: VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID and ' +
        'VITE_AUTH0_AUDIENCE must all be set. See frontend/.env.example.'
    )
  }

  // After Auth0 redirects back, re-route to wherever the user was
  // trying to go (or home). `appState.returnTo` is set by
  // RequireAuthRoute via loginWithRedirect when a guard kicks in.
  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo ?? '/', { replace: true })
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}
