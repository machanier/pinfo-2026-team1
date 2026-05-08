// GUIDE_AUTH0_INTEGRATION.md

# Guide d'Intégration Auth0 avec React + Vite

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration Auth0](#configuration-auth0)
3. [Setup du Frontend](#setup-du-frontend)
4. [Architecture](#architecture)
5. [Utilisation](#utilisation)
6. [Erreurs Courantes](#erreurs-courantes)
7. [Bonnes Pratiques Sécurité](#bonnes-pratiques-sécurité)

---

## Vue d'ensemble

Cette intégration utilise:

- **@auth0/auth0-react** : SDK officiel Auth0 pour React
- **Axios** : HTTP client avec interceptors pour ajouter le JWT token
- **AppContext** : Gestion d'état global avec les données Auth0
- **Variables d'environnement** : Configuration externalisée (VITE\_\*)

### Flux d'authentification complet

```
┌─────────────┐
│ Application │
│   (Vite)    │
└──────┬──────┘
       │
       ├─→ [1] Utilisateur clique "Se connecter"
       │
       ├─→ [2] Redirection vers Auth0 (loginWithRedirect)
       │
├─────────────────────────────────────┤
│ Auth0 (auth.example.auth0.com)      │
│ - Authentification utilisateur       │
│ - Émission du JWT token             │
└─────────────────────────────────────┘
       │
       ├─→ [3] Redirection vers application avec code
       │
       ├─→ [4] Exchange code → JWT token (auto, via auth0-react)
       │
       ├─→ [5] AppContext restaure l'état utilisateur
       │
       ├─→ [6] getAccessTokenSilently() avant chaque requête API
       │
       └─→ [7] Bearer token attaché au header Authorization

┌─────────────┐
│   Backend   │
│   (API)     │
│ :8081       │
└─────────────┘
   Vérifie le token → Réponse sécurisée
```

---

## Configuration Auth0

### Étape 1: Créer une application Auth0

1. Aller à https://manage.auth0.com
2. Dashboard → Applications → Create Application
3. Choisir: **Single Page Application**
4. Framework: **React**

### Étape 2: Configurer l'application

**Settings** → Onglet **Application URIs**

```
Application Login URI:
http://localhost:5173    (développement local)
https://yourdomain.com   (production)

Allowed Callback URLs:
http://localhost:5173
https://yourdomain.com

Allowed Logout URLs:
http://localhost:5173
https://yourdomain.com

Allowed Web Origins:
http://localhost:5173
https://yourdomain.com
```

### Étape 3: Créer une API (pour le backend)

1. Dashboard → APIs → Create API
2. Name: `UniEvents API` (ou nom de votre API)
3. Identifier: `https://api.unigevents.ch` (ou votre domain)
4. Signing Algorithm: `RS256`

**Important:** Cet identifier devient votre `VITE_AUTH0_AUDIENCE`

### Étape 4: Ajouter les claims personnalisés (optionnel)

Pour ajouter des infos custom (ex: rôle utilisateur) dans le token:

1. Dashboard → Actions → Flows → Login
2. Create Action personnalisée:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // Ajouter le rôle au token
  api.idToken.setCustomClaim(
    'https://pinfo.unige.ch/role',
    event.user.user_metadata?.role || 'STUDENT',
  )
}
```

### Étape 5: Récupérer les credentials

De la page Settings de votre app:

- **Domain**: `xxx.auth0.com`
- **Client ID**: `xxxxxxxxxxxxx`
- **Audience** (de votre API): `https://api.unigevents.ch`

---

## Setup du Frontend

### Installation des dépendances

```bash
cd /workspace/frontend

# Auth0
npm install @auth0/auth0-react

# HTTP Client (si pas déjà installé)
npm install axios

# React Router (normalement déjà installé)
npm install react-router-dom@latest
```

### Configuration des variables d'environnement

Créer `.env.local` (ne pas commiter):

```env
# Auth0
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id_here
VITE_AUTH0_AUDIENCE=https://api.unigevents.ch

# Backend API
VITE_API_URL=http://localhost:8081
VITE_API_TIMEOUT=30000
```

Voir `.env.example` pour la structure complète.

### Fichiers modifiés/créés

#### 1. `src/main.jsx` - Setup Auth0Provider

```javascript
import { Auth0Provider } from '@auth0/auth0-react'

const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
}

// Auth0Provider enveloppe l'application
<Auth0Provider {...auth0Config}>
  <App />
</Auth0Provider>
```

#### 2. `src/contexts/AppContext.jsx` - Refactorisé pour Auth0

```javascript
import { useAuth0 } from '@auth0/auth0-react'

// Récupère les données Auth0
const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently } =
  useAuth0()

// Crée un AppContext qui utilise Auth0
// Compatible avec les composants existants
```

#### 3. `src/lib/api.js` - Configuration Axios

- Crée des clients Axios (authentifié et non-authentifié)
- Interceptor pour attacher le Bearer token
- Gestion automatique de l'expiration du token

#### 4. `src/hooks/useApi.js` - Hook pour requêtes sécurisées

```javascript
const { data, error, isLoading, execute } = useApi()

// Appeler une requête
const result = await execute('GET', '/api/users/profile')
```

#### 5. `src/lib/apiServices.js` - Fonctions métier

```javascript
import { fetchUserProfile, pingBackend } from '@/lib/apiServices'

// Tester la connexion
const health = await pingBackend()

// Récupérer le profil utilisateur
const profile = await fetchUserProfile()
```

#### 6. `src/pages/LoginPage.jsx` - Mise à jour pour Auth0

- Affiche un bouton "Se connecter avec Auth0"
- Gère les redirections automatiques
- Affiche les messages d'état

---

## Architecture

```
src/
├── main.jsx                          # Setup Auth0Provider
├── contexts/
│   ├── AppContext.jsx               # État global (utilise Auth0)
│   ├── useApp.jsx                   # Hook pour accéder au contexte
│   └── AppContextValue.jsx          # Création du contexte
├── lib/
│   ├── api.js                       # Config Axios + interceptor Auth0
│   └── apiServices.js               # Fonctions métier (backend calls)
├── hooks/
│   └── useApi.js                    # Hook pour requêtes sécurisées
├── pages/
│   └── LoginPage.jsx                # Page de connexion Auth0
└── components/
    └── layout/
        └── Navbar.jsx               # Intégration logout Auth0
```

---

## Utilisation

### 1. Lire les données de l'utilisateur

```javascript
import { useApp } from '@/contexts/useApp'

export function MyComponent() {
  const { user, displayName, userRole, isAuthenticated } = useApp()

  return (
    <div>
      <p>Bienvenue {displayName}</p>
      <p>Rôle: {userRole}</p>
      {!isAuthenticated && <p>Non authentifié</p>}
    </div>
  )
}
```

### 2. Appeler une API sécurisée

```javascript
import { useApi } from '@/hooks/useApi'

export function UserProfile() {
  const { data: profile, isLoading, error, execute } = useApi()

  useEffect(() => {
    execute('GET', '/api/users/profile')
  }, [execute])

  if (isLoading) return <p>Chargement...</p>
  if (error) return <p>Erreur: {error.message}</p>

  return <div>{profile?.email}</div>
}
```

### 3. Utiliser les fonctions de service

```javascript
import { fetchUserProfile, pingBackend } from '@/lib/apiServices'

export function Dashboard() {
  useEffect(() => {
    const test = async () => {
      try {
        const profile = await fetchUserProfile()
        console.log('Profile:', profile)
      } catch (err) {
        console.error('Erreur:', err.message)
      }
    }

    test()
  }, [])

  return <div>Dashboard</div>
}
```

### 4. Logout

```javascript
import { useApp } from '@/contexts/useApp'

export function LogoutButton() {
  const { logout } = useApp()

  return <button onClick={logout}>Déconnexion</button>
}
```

---

## Erreurs Courantes

### ❌ "Cannot read property 'useAuth0' of undefined"

**Cause:** Auth0Provider n'enveloppe pas le composant

**Solution:**

```javascript
// ✅ Correct: Auth0Provider → BrowserRouter → App
<Auth0Provider>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</Auth0Provider>

// ❌ Incorrect: Auth0Provider sans BrowserRouter
<Auth0Provider>
  <App />
</Auth0Provider>
```

### ❌ "401 Unauthorized" sur tous les appels API

**Cause:** Token n'est pas attaché au header Authorization

**Solution:**

1. Vérifier que `setupAuth0Interceptor()` est appelé
2. Vérifier que l'interceptor s'exécute (logs console)
3. Vérifier que `VITE_AUTH0_AUDIENCE` est défini

```javascript
// Dans AppContext ou au démarrage
import { setupAuth0Interceptor } from '@/lib/api'

setupAuth0Interceptor(getAccessTokenSilently)
```

### ❌ "Token audience is invalid"

**Cause:** L'audience du token ne correspond pas à l'API

**Solution:**

1. Vérifier que `VITE_AUTH0_AUDIENCE` correspond au **Identifier** de votre API Auth0
2. Relancer le navigateur après changement de `.env.local`

```env
# Doit correspondre exactement à l'API Identifier
VITE_AUTH0_AUDIENCE=https://api.unigevents.ch
```

### ❌ "Redirect URI mismatch"

**Cause:** L'URL de redirection n'est pas autorisée

**Solution:**

1. Auth0 Dashboard → Applications → Settings
2. Vérifier **Allowed Callback URLs**:
   - `http://localhost:5173` (local)
   - `https://yourdomain.com` (production)

### ❌ Login redirige partout sauf vers le profil

**Cause:** `navigate('/profile')` n'est pas appelé après login

**Solution:**
Vérifier que `useEffect` dans LoginPage:

```javascript
useEffect(() => {
  if (isAuthenticated && !isLoading) {
    navigate('/profile') // ← Obligatoire
  }
}, [isAuthenticated, isLoading, navigate])
```

---

## Bonnes Pratiques Sécurité

### ✅ DO: Bien faire

1. **Stocker le token en mémoire, PAS en localStorage**
   - La librairie auth0-react gère automatiquement le stockage sécurisé
   - Ne JAMAIS faire `localStorage.setItem('token', token)`

2. **Utiliser HTTPS en production**
   - Auth0 requiert HTTPS pour les callback URLs en production

3. **Valider le token côté backend**
   - Vérifier la signature JWT
   - Vérifier l'audience (`aud` claim)
   - Vérifier l'expiration (`exp` claim)

4. **Renouveler les tokens automatiquement**
   - `getAccessTokenSilently()` le fait automatiquement
   - Auth0 émet des tokens courts + refresh tokens longs

5. **Utiliser CORS côté backend**
   - Autoriser ONLY votre frontend domain
   ```java
   // Spring
   @CrossOrigin(origins = "https://yourdomain.com")
   ```

### ❌ DON'T: À éviter

1. ❌ Ne PAS stocker le token complet en localStorage
2. ❌ Ne PAS exposer le Client Secret côté frontend
3. ❌ Ne PAS faire de validation de JWT côté frontend
4. ❌ Ne PAS accepter des tokens d'autres sources
5. ❌ Ne PAS désactiver la validation HTTPS en production

---

## Vérification de l'Installation

Tester que tout fonctionne:

```bash
# 1. Vérifier les variables d'environnement
cat .env.local | grep VITE_AUTH0

# 2. Démarrer l'app
npm run dev

# 3. Ouvrir http://localhost:5173
# 4. Cliquer sur "Se connecter avec Auth0"
# 5. Vous devriez être redirigé vers Auth0
# 6. Après login, redirection vers /profile

# 7. Console: Vérifier que les logs API apparaissent
# [API] GET /api/users/profile

# 8. DevTools Network: Vérifier le header Authorization
# Authorization: Bearer eyJhbGc...
```

---

## Support & Ressources

- **Auth0 Docs**: https://auth0.com/docs/quickstart/spa/react
- **Auth0 React SDK**: https://github.com/auth0/auth0-react
- **JWT.io**: Decoder les tokens https://jwt.io
- **Auth0 Dashboard**: https://manage.auth0.com

---

## Checklist de Déploiement

Avant de mettre en production:

- [ ] Variables d'environnement définies en production
- [ ] HTTPS activé
- [ ] Callback URLs mises à jour dans Auth0
- [ ] CORS configuré côté backend
- [ ] Validation JWT côté backend
- [ ] Logs de sécurité en place
- [ ] Gestion des tokens expiré testée
- [ ] Logout fonctionne correctement
- [ ] Tests end-to-end passent

---

Generated: 2026-05-02
Last Updated: Auth0 React SDK v3.0+, Vite 5.0+, React 18+
