// src/contexts/AppContext.jsx
import { useState } from 'react'
import { AppContext } from './AppContextValue'

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState('STUDENT')
  const [displayName, setDisplayName] = useState('Exemple Student')
  const [savedEvents, setSavedEvents] = useState([])

  return (
    <AppContext.Provider
      value={{
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
