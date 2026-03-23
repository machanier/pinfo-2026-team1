// src/contexts/AppContext.jsx
import { useState } from 'react'
import { AppContext } from './AppContextValue'

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState('STUDENT')
  const [display_name, setDisplayName] = useState('Gabin Prunet')
  const [savedEvents, setSavedEvents] = useState([])

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        display_name,
        setDisplayName,
        savedEvents,
        setSavedEvents,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
