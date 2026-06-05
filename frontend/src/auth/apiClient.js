// PINFO-190 — Authenticated axios client.
//
// Returns a fresh axios instance whose every outbound request carries the
// current Auth0 access token in the `Authorization: Bearer …` header. The
// token is fetched via getAccessTokenSilently() which:
//   - returns a cached token if it's still valid,
//   - silently refreshes via the refresh-token rotation flow otherwise,
//   - falls back to a redirect to the login screen if all else fails.
//
// We don't wrap getAccessTokenSilently in axios's request interceptor with
// `useEffect` mounting magic — that pattern leaks instances when components
// unmount. Instead, components call useApiClient() and the resulting axios
// instance lives only as long as the component that created it.

import axios from 'axios'
import { useAuth0 } from '@auth0/auth0-react'
import { useMemo } from 'react'

export function useApiClient() {
  const { getAccessTokenSilently } = useAuth0()

  // useMemo so React doesn't rebuild the axios instance on every render.
  return useMemo(() => {
    // No baseURL: callers pass full paths like '/api/users/me' to keep
    // parity with src/lib/apiClient.js (PINFO-29). nginx routes '/api'
    // to Kong either way. A baseURL would force a repo-wide rewrite for
    // no functional win.
    const instance = axios.create({
      timeout: 10_000,
    })

    instance.interceptors.request.use(async (config) => {
      try {
        const token = await getAccessTokenSilently()
        config.headers.Authorization = `Bearer ${token}`
      } catch (err) {
        // If getAccessTokenSilently fails (e.g. user cleared cookies, or
        // the refresh token is dead), let the request go through without
        // a token. Kong will reply 401 and the caller can decide whether
        // to redirect to login. We deliberately don't redirect here —
        // background API calls (notifications poll, etc.) should not
        // hijack the user's navigation.
        if (import.meta.env.DEV) {
          console.warn('Auth0 silent auth failed:', err)
        }
      }
      return config
    })

    return instance
  }, [getAccessTokenSilently])
}
