import axios from 'axios'

function getStoredToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return (
    window.localStorage.getItem('auth_token') ||
    window.localStorage.getItem('access_token') ||
    window.sessionStorage.getItem('auth_token') ||
    window.sessionStorage.getItem('access_token')
  )
}

function getAuthToken() {
  const storedToken = getStoredToken()

  if (storedToken) {
    return storedToken
  }

  if (import.meta.env.DEV) {
    return import.meta.env.VITE_DEV_JWT_TOKEN || null
  }

  return null
}

const apiClient = axios.create({
  baseURL:
    typeof import.meta.env.VITE_API_BASE_URL === 'string' &&
    import.meta.env.VITE_API_BASE_URL.trim().length > 0
      ? import.meta.env.VITE_API_BASE_URL
      : '/',
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default apiClient
