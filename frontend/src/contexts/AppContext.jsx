// src/contexts/AppContext.jsx
import { useState } from 'react'
import { AppContext } from './AppContextValue'

export const AppProvider = ({ children }) => {
  const getBrowserStorageValue = (key) => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key)
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState('STUDENT')
  const [displayName, setDisplayName] = useState('Exemple Student')
  const [displayName, setDisplayName] = useState('Student Test')
  const [savedEvents, setSavedEvents] = useState([])
  const [currentUserId, setCurrentUserId] = useState(() =>
    getBrowserStorageValue('current_user_id'),
  )
  const [authToken, setAuthToken] = useState(() => getBrowserStorageValue('auth_token'))

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        userRole,
        setUserRole,
        displayName,
        setDisplayName,
        savedEvents,
        setSavedEvents,
        currentUserId,
        setCurrentUserId,
        authToken,
        setAuthToken,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
