// src/contexts/AppContext.jsx
//
// PINFO-190 — auth state derives from Auth0 instead of being held in
// local React state. The previous mock kept `isAuthenticated` and
// `userRole` as booleans the user could flip from React DevTools, which
// gave a false sense of security and would have broken the moment any
// API call needed a real bearer token.
//
// Role is read from the namespaced custom claim
// `https://unigevents.com/roles` injected by the Auth0 Action that runs
// at post-login (see docs/AUTH0.md > "Add roles to access token"). The
// backend reads the same path via
// smallrye.jwt.path.groups=https://unigevents.com/roles.
//
// PINFO-29 introduced a /api/users/me hydration step to map the Auth0
// subject to our internal UUID (used as `currentUserId`). That hydration
// is preserved here, but driven by useApiClient() so the Authorization
// header is set transparently by the Auth0 SDK instead of being read
// out of localStorage. The API result, if any, OVERRIDES the values
// we read from the Auth0 ID token claims.
import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useApiClient } from '../auth/apiClient'
import { setApiTokenGetter } from '../lib/apiClient'
import { AppContext } from './AppContextValue'

const ROLES_CLAIM = 'https://unigevents.com/roles'

export const AppProvider = ({ children }) => {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0()
  const apiClient = useApiClient()

  // Wire the singleton apiClient (src/lib/apiClient.js) to Auth0 so code
  // that runs outside React (TanStack Query queryFn callbacks in
  // profileUtils.js) sends authenticated requests too.
  useEffect(() => {
    setApiTokenGetter(getAccessTokenSilently)
    return () => setApiTokenGetter(null)
  }, [getAccessTokenSilently])

  // Stored ONLY when /api/users/me has answered. Until then, we fall
  // back to whatever Auth0 puts in the ID token. Keeping these in
  // dedicated state (instead of overwriting userRole / displayName
  // from inside an effect) avoids the react-hooks/set-state-in-effect
  // anti-pattern.
  const [apiUserId, setApiUserId] = useState(null)
  const [apiRole, setApiRole] = useState(null)
  const [apiName, setApiName] = useState(null)
  const [savedEvents, setSavedEvents] = useState([])

  const auth0Role = (user?.[ROLES_CLAIM]?.[0] ?? 'STUDENT').toUpperCase()
  const auth0Name = user?.name ?? ''

  // Derived values, recomputed every render — no setState shenanigans.
  const userRole = apiRole ?? auth0Role
  const displayName = apiName ?? auth0Name
  const currentUserId = apiUserId

  useEffect(() => {
    if (!isAuthenticated) {
      // Wipe API-derived state on logout so values from a previous
      // session don't leak to the next user that signs in. We ARE
      // synchronizing with an external system (Auth0's session) — the
      // lint rule's typical concern (cascading derived-state renders)
      // doesn't apply here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiUserId(null)
      setApiRole(null)
      setApiName(null)
      return
    }

    let cancelled = false
    const hydrate = async () => {
      try {
        const response = await apiClient.get('/api/users/me')
        const me = response.data
        if (cancelled || !me?.id) return
        setApiUserId(me.id)
        if (me.name) setApiName(me.name)
        if (me.role) setApiRole(String(me.role).toUpperCase())
      } catch {
        // Backend unavailable, or 404 (user not yet provisioned in our
        // DB). Fall back to Auth0 token claims.
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, apiClient])

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userRole,
        displayName,
        currentUserId,
        savedEvents,
        setSavedEvents,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
