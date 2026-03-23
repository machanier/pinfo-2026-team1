// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import MainLayout from './layouts/MainLayout'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Route publique hors layout */}
          <Route path="/login" element={<div className="p-10 text-center">Page de Login</div>} />

          {/* Routes privées avec Sidebar/Navbar */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>Bienvenue sur UNIGEvents !</div>} />
            <Route path="/profile" element={<div>Mon Profil (Ticket PINFO-29)</div>} />
            <Route path="/my-events" element={<div>Mes Inscriptions / Événements</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
