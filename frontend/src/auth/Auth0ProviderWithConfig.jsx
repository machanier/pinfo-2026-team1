// PINFO-190 — Auth0 SPA wrapper.
//
// Pulls the three Auth0 config values from VITE_* env vars (see
// frontend/.env.example) and wires them into the official @auth0/auth0-react
// provider. The hard part is choosing safe defaults:
//
//   cacheLocation: 'memory'
//     The access token never lands in localStorage / sessionStorage, so
//     XSS in any third-party script we load cannot read it. The downside
//     is that a hard refresh forces a silent re-auth (one redirect to
//     Auth0 in the background) — acceptable for our trade-off.
//
//   useRefreshTokens: true
//     Pairs with cacheLocation:'memory' to give us a fresh access token
//     across page reloads via a refresh-token rotation flow, instead of
//     punishing users with a redirect every time they refresh.
//
//   authorizationParams.audience
//     Required for Auth0 to issue an *access* token (not just an id
//     token) bound to our API. Backend Quarkus services validate this
//     audience via mp.jwt.verify.audiences.
//
//   authorizationParams.scope
//     'openid profile email offline_access' — offline_access enables
//     refresh tokens; the rest are standard OIDC scopes.

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

  // After Auth0 redirects back, re-route to wherever the user was trying
  // to go (or home). `appState.returnTo` is set by RequireAuthRoute below.
  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo ?? window.location.pathname, { replace: true })
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: 'openid profile email offline_access',
      }}
      cacheLocation="memory"
      useRefreshTokens
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}
