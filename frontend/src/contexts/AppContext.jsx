// src/contexts/AppContext.jsx
import { useState } from 'react'
import { AppContext } from './AppContextValue'

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [userRole, setUserRole] = useState('STUDENT')
  const [displayName, setDisplayName] = useState('Student Test')
  const [savedEvents, setSavedEvents] = useState([])

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
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
