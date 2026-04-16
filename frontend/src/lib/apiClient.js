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

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default apiClient
