// PINFO-190 — Singleton axios client used by code that runs outside
// React render (e.g. profileUtils.js queryFn callbacks passed to
// TanStack Query). React hooks like useApiClient (src/auth/apiClient.js)
// can't be called from such callbacks, so we keep one shared axios
// instance whose Authorization header is filled via a token-getter that
// AppContext registers at mount time.
//
// Without a registered getter (e.g. in unit tests that don't mount the
// provider tree), the request goes through unauthenticated and Kong
// will answer 401 — same fallback behaviour as the Auth0-aware
// useApiClient hook in src/auth/apiClient.js.

import axios from 'axios'

let tokenGetter = null

/**
 * Called once by AppContext after Auth0 finishes loading. Subsequent
 * requests read the latest access token via this function.
 */
export function setApiTokenGetter(fn) {
  tokenGetter = fn
}

const apiClient = axios.create({
  // Empty baseURL: callers pass full paths like '/api/users/me'. This
  // matches the path nginx forwards to Kong.
  baseURL: '',
  timeout: 10_000,
})

apiClient.interceptors.request.use(async (config) => {
  if (typeof tokenGetter !== 'function') {
    return config
  }
  try {
    const token = await tokenGetter()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // Silent — let the request go through unauthenticated. Kong will
    // 401 and the caller decides whether to redirect to login.
  }
  return config
})

export default apiClient
