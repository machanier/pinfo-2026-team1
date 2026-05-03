import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Auth0Provider } from '@auth0/auth0-react'
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient()

/**
 * Configuration Auth0
 * Les variables d'environnement doivent être définies dans .env
 * et commencer par VITE_ pour être accessibles côté client
 */
const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin,
    // Audience: l'identifiant unique de votre API Auth0
    // Ceci assure que le token sera valide pour votre backend
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
}

/**
 * Validation de la configuration Auth0
 * Affiche une alerte si les variables d'environnement ne sont pas configurées
 */
if (!auth0Config.domain || !auth0Config.clientId) {
  console.warn(
    "⚠️ Configuration Auth0 incomplète. Vérifiez les variables d'environnement: VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID",
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider {...auth0Config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Auth0Provider>
  </StrictMode>,
)
