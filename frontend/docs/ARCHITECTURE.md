# Architecture Frontend — UniGevents

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technique](#2-stack-technique)
3. [Structure des dossiers](#3-structure-des-dossiers)
4. [Routing](#4-routing)
5. [Gestion de l'état](#5-gestion-de-létat)
6. [Couche API](#6-couche-api)
7. [Authentification](#7-authentification)
8. [Composants](#8-composants)
9. [Styles](#9-styles)
10. [Tests](#10-tests)
11. [Configuration & Build](#11-configuration--build)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [Mode démo](#13-mode-démo)
14. [Flux de données](#14-flux-de-données)

---

## 1. Vue d'ensemble

UniGevents est une **SPA React** (Single Page Application) qui permet aux étudiants et organisateurs de l'Université de Genève de découvrir, créer et gérer des événements universitaires.

L'application communique avec un **backend microservices** via un reverse proxy Vite (dev) ou Nginx (prod). L'authentification est déléguée à **Auth0**.

---

## 2. Stack technique

| Catégorie | Technologie | Version |
|-----------|-------------|---------|
| Framework UI | React | 19.2.6 |
| Routing | React Router DOM | 7.16.0 |
| Authentification | Auth0 React SDK | 2.17.0 |
| Fetching / Cache | TanStack Query (React Query) | 5.100.14 |
| Client HTTP | Axios | 1.16.1 |
| Icônes | Lucide React | 1.17.0 |
| Styles | Tailwind CSS | 4.2.2 |
| Build tool | Vite | 7.3.3 |
| Tests | Vitest + @testing-library/react | 4.1.2 / 16.3.2 |
| Couverture | v8 (lcov pour SonarCloud) | — |

---

## 3. Structure des dossiers

```
frontend/
├── public/                         # Assets statiques servis tels quels
├── src/
│   ├── auth/                       # Intégration Auth0
│   │   ├── Auth0ProviderWithConfig.jsx  # Provider Auth0 configuré
│   │   └── apiClient.js            # Enregistrement de l'intercepteur token
│   ├── components/                 # Composants réutilisables
│   │   ├── ErrorBoundary.jsx       # Gestionnaire d'erreurs React
│   │   ├── event/                  # Composants liés aux événements
│   │   │   ├── BannerUpload.jsx    # Upload image Cloudinary
│   │   │   ├── EventCard.jsx       # Carte d'événement (liste, grille)
│   │   │   └── EventFormShared.jsx # Champs communs create/edit
│   │   ├── layout/                 # Composants de mise en page
│   │   │   ├── Navbar.jsx          # Barre de navigation supérieure
│   │   │   ├── Sidebar.jsx         # Navigation latérale (toggleable)
│   │   │   ├── Footer.jsx          # Pied de page
│   │   │   └── navItems.js         # Configuration des items de navigation
│   │   └── ui/                     # Primitives UI (pas de librairie externe)
│   │       ├── badge.jsx
│   │       └── button.jsx
│   ├── contexts/                   # State global via React Context
│   │   ├── AppContext.jsx          # Provider principal (auth + favoris + démo)
│   │   ├── AppContextValue.jsx     # Valeur initiale du contexte
│   │   └── useApp.jsx              # Hook d'accès au contexte
│   ├── hooks/                      # Hooks React personnalisés
│   │   ├── useApi.js               # Requêtes API impératives avec gestion d'état
│   │   └── useEventForm.js         # État du formulaire création/édition d'événement
│   ├── layouts/                    # Gabarits de page
│   │   └── MainLayout.jsx          # Wraps Navbar + Sidebar + Footer + contenu
│   ├── lib/                        # Utilitaires et services
│   │   ├── api.js                  # Configuration Axios + intercepteurs Auth0
│   │   ├── apiClient.js            # Instance Axios singleton
│   │   ├── apiServices.js          # Fonctions d'appel aux endpoints
│   │   ├── categories.js           # Constantes catégories d'événements
│   │   ├── cloudinaryAvatar.js     # Upload avatar vers Cloudinary
│   │   ├── cloudinaryBanner.js     # Upload bannière vers Cloudinary
│   │   ├── demoMode.js             # Feature flag mode démo
│   │   ├── profileUtils.js         # Utilitaires profil utilisateur
│   │   ├── sampleEvents.js         # Données fictives pour le mode démo
│   │   └── universityData.js       # Facultés et filières (UNIGE)
│   ├── pages/                      # Composants de route (19 pages)
│   │   ├── HomePage.jsx
│   │   ├── EventsPage.jsx
│   │   ├── EventDetailPage.jsx
│   │   ├── EventCreatePage.jsx
│   │   ├── EventEditPage.jsx
│   │   ├── MyEventsPage.jsx
│   │   ├── CalendarPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── EditProfilePage.jsx
│   │   ├── OrganizerProfilePage.jsx
│   │   ├── NotificationsPage.jsx
│   │   ├── AdminModerationPage.jsx
│   │   ├── AdminModerationDetailPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── AboutPage.jsx
│   │   ├── HelpPage.jsx
│   │   ├── ContactPage.jsx
│   │   ├── PrivacyPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── routes/                     # Guards de routes
│   │   └── AuthRouteWrappers.jsx
│   ├── styles/
│   │   ├── figma-tokens.json       # Tokens de design Figma (couleurs, typographie)
│   │   └── index.css               # Styles globaux + imports Tailwind
│   ├── App.jsx                     # Arbre React Router complet
│   ├── main.jsx                    # Point d'entrée (providers racine)
│   └── setupTests.js               # Configuration Vitest (stubs, cleanup)
├── index.html                      # Shell HTML (point d'entrée Vite)
├── vite.config.js                  # Build, proxy dev, config tests
├── tailwind.config.js              # Thème Tailwind (tokens Figma)
├── postcss.config.js               # PostCSS (Tailwind v4 + autoprefixer)
├── eslint.config.js                # Règles ESLint
├── .env.example                    # Template variables d'environnement
├── Dockerfile                      # Image Docker de production
├── nginx.conf                      # Config Nginx (reverse proxy prod)
└── scripts/                        # Scripts utilitaires de build
```

---

## 4. Routing

Le routing est géré par **React Router v7** (`BrowserRouter`), configuré dans [`src/App.jsx`](../src/App.jsx).

### Arbre des routes

```
/login                         → LoginPage              [PublicOnlyRoute]
/                              → HomePage               [public]
/search                        → EventsPage             [public]
/events/:id                    → EventDetailPage        [public]
/organizers/:id                → OrganizerProfilePage   [public]
/a-propos                      → AboutPage              [public]
/aide                          → HelpPage               [public]
/contact                       → ContactPage            [public]
/confidentialite               → PrivacyPage            [public]
/profile                       → ProfilePage            [RequireAuth]
/profile/edit                  → EditProfilePage        [RequireAuth]
/profile/:id                   → ProfilePage            [RequireAuth]
/profile/:id/edit              → EditProfilePage        [RequireAuth]
/my-events                     → MyEventsPage           [RequireAuth]
/calendar                      → CalendarPage           [RequireAuth]
/events/create                 → EventCreatePage        [RequireRole: ORGANIZER|ADMIN]
/events/edit/:id               → EventEditPage          [RequireRole: ORGANIZER|ADMIN]
/notifications                 → NotificationsPage      [RequireAuth]
/events                        → redirect → /my-events  [RequireAuth]
/admin/moderation              → AdminModerationPage    [RequireRole: ADMIN]
/admin/moderation/:caseId      → AdminModerationDetailPage [RequireRole: ADMIN]
*                              → NotFoundPage
```

### Guards de routes — [`src/routes/AuthRouteWrappers.jsx`](../src/routes/AuthRouteWrappers.jsx)

| Guard | Comportement |
|-------|-------------|
| `PublicOnlyRoute` | Redirige vers `/` si déjà authentifié (ex: `/login`) |
| `RequireAuthRoute` | Redirige vers `/login` si non authentifié ; mémorise l'URL de retour |
| `RequireRoleRoute` | Redirige si le rôle Auth0 ne correspond pas ; accepte un tableau de rôles autorisés |

En **mode démo** (`VITE_DEMO_MODE=true`), tous les guards laissent passer sans vérification Auth0.

---

## 5. Gestion de l'état

L'application n'utilise **ni Redux ni Zustand**. La gestion de l'état est répartie sur trois niveaux :

### 5.1 AppContext — [`src/contexts/AppContext.jsx`](../src/contexts/AppContext.jsx)

État global de l'application, accessible via `useApp()`.

**État exposé :**

| Clé | Type | Source |
|-----|------|--------|
| `isAuthenticated` | boolean | Auth0 |
| `isLoading` | boolean | Auth0 |
| `user` | object | Auth0 |
| `userRole` | `STUDENT \| ORGANIZER \| ADMIN` | claim Auth0 `https://unigevents.com/roles` |
| `currentUserId` | UUID string | `GET /api/users/me` (backend) |
| `savedEvents` | string[] | localStorage `savedEvents` |
| `displayName` | string | Auth0 |
| `userEmail` | string | Auth0 |
| `isDemo` | boolean | `VITE_DEMO_MODE` |
| `isDemoIdentity` | boolean | mode démo actif avec identité fictive |

**Fonctions exposées :**

| Fonction | Description |
|----------|-------------|
| `login(options)` | Redirige vers Auth0 login |
| `logout()` | Déconnexion Auth0 + vide les favoris |
| `toggleFavorite(eventId)` | Ajoute/retire un événement des favoris |
| `isFavorite(eventId)` | Vérifie si un événement est en favori |
| `signInDemo()` | Réactive l'identité démo |
| `getToken()` | Retourne le token Auth0 courant |

**Persistance locale :**
- `localStorage.savedEvents` — IDs des événements favoris
- `localStorage.layoutMode` — préférence `'sidebar'` ou `'topbar'`
- `sessionStorage.demoSignedOut` — flag de déconnexion en mode démo

### 5.2 TanStack Query

Utilisé dans les pages pour le **fetching avec cache**. Exemple dans `HomePage` :

```js
useQuery(['publicEvents', page], () => fetchEvents({ page }))
```

L'instance globale `QueryClient` est créée dans [`src/main.jsx`](../src/main.jsx).

### 5.3 Hook `useApi`

Pour les requêtes impératives (POST, PUT, DELETE) ou les cas où TanStack Query ne convient pas :

```js
const { data, loading, error, execute } = useApi({ method: 'POST', url: '/api/events' })
```

---

## 6. Couche API

### Instance Axios — [`src/lib/apiClient.js`](../src/lib/apiClient.js)

Singleton Axios partagé par toute l'application. Le token Bearer est injecté automatiquement via un intercepteur de requête configuré dans [`src/lib/api.js`](../src/lib/api.js).

**Intercepteur de requête :**
- Appelle `getAccessTokenSilently()` (Auth0)
- Ajoute l'en-tête `Authorization: Bearer <token>`
- Log la requête en mode dev

**Intercepteur de réponse :**
- `401` → redirige vers login
- `403` → log l'erreur d'autorisation
- `404` → log la ressource non trouvée

### Fonctions de service — [`src/lib/apiServices.js`](../src/lib/apiServices.js)

Fonctions nommées wrappant les appels Axios :

| Fonction | Endpoint |
|----------|----------|
| `fetchUserProfile()` | `GET /api/users/me` |
| `updateUserProfile(userId, data)` | `PUT /api/users/{id}` |
| `fetchEvents(params)` | `GET /api/events` |
| *(+ fonctions notifications, modération, inscriptions)* | |

### Proxy dev (Vite) vers microservices

En développement local, Vite proxifie les routes API vers les microservices individuels :

| Préfixe | Port | Service |
|---------|------|---------|
| `/api/users` | 8081 | Users service |
| `/api/events` | 8082 | Events service |
| `/api/notifications` | 8083 | Notifications service |
| `/api/moderation` | 8084 | Moderation service |
| `/api/search` | 8085 | Search service |
| `/api/registrations` | 8086 | Registrations service |

En production, Nginx route tout vers une gateway unique (`VITE_API_PROXY_TARGET`).

### Upload Cloudinary

Les signatures d'upload sont générées côté serveur via `GET /api/users/me/avatar-upload-signature`. Cloudinary n'est jamais appelé avec des secrets frontend.

---

## 7. Authentification

Flux Auth0 SPA (Authorization Code Flow + PKCE) :

```
Utilisateur → Login Auth0 → Callback → Token stocké en localStorage
                                           ↓
                               Axios intercepteur → Authorization: Bearer <token>
                                           ↓
                               Backend → JWT validation
```

**Configuration — [`src/auth/Auth0ProviderWithConfig.jsx`](../src/auth/Auth0ProviderWithConfig.jsx) :**
- `cacheLocation: 'localstorage'` — tokens persistés entre reloads
- `audience: https://api.unigevents.ch`
- `scope: openid profile email`
- `onRedirectCallback` — redirige vers l'URL mémorisée après login

**Rôles utilisateur** (claim Auth0 custom) :
- `STUDENT` — accès standard
- `ORGANIZER` — peut créer et gérer des événements
- `ADMIN` — accès modération + toutes fonctionnalités

---

## 8. Composants

### Hiérarchie

```
main.jsx
└── Auth0ProviderWithConfig
    └── QueryClientProvider
        └── AppContext.Provider
            └── BrowserRouter
                └── App (routes)
                    ├── LoginPage
                    └── MainLayout
                        ├── Navbar
                        ├── Sidebar
                        ├── <Page />   ← contenu de la route active
                        └── Footer
```

### `MainLayout` — [`src/layouts/MainLayout.jsx`](../src/layouts/MainLayout.jsx)

- Gère l'affichage/masquage de la sidebar (responsive mobile)
- Toggle entre les modes de layout `sidebar` et `topbar` (persisté en localStorage)
- Scroll en haut à chaque changement de route
- Affiche une bannière en mode démo

### Composants UI

Tous les composants UI sont **custom** (pas de librairie externe comme MUI ou Chakra). Ils utilisent Tailwind CSS directement.

---

## 9. Styles

- **Tailwind CSS v4** via PostCSS
- Thème étendu avec des **tokens Figma** (`src/styles/figma-tokens.json`, synchronisés via `npm run sync-figma`)
- Styles globaux dans `src/styles/index.css`
- Pas de CSS Modules ni de CSS-in-JS

---

## 10. Tests

**Framework :** Vitest + jsdom + @testing-library/react

### Configuration — [`src/setupTests.js`](../src/setupTests.js)

- Variables d'environnement Auth0 stubbées (`test.auth0.local`, `test-client-id`)
- Variables Cloudinary stubbées
- `demoMode.js` mocké → mode démo désactivé dans les tests
- `localStorage` / `sessionStorage` en mémoire (jsdom)
- `Element.prototype.scrollTo` stubbé
- `cleanup()` après chaque test

### Couverture

- Provider : v8
- Format : lcov (intégration SonarCloud)
- Exclusions : `node_modules`, `src/main.jsx`, `setupTests.js`, `*.test.jsx`

### Fichiers de test

Les tests sont **colocalisés** avec le code source (`*.test.jsx` / `*.test.js`).

| Zone | Fichiers testés |
|------|-----------------|
| Routing | `App.test.jsx`, `AuthRouteWrappers.test.jsx` |
| Contexte | `AppContext.test.jsx`, `useApp.test.jsx` |
| Auth | `Auth0ProviderWithConfig.test.jsx`, `apiClient.test.jsx` |
| Hooks | `useApi.test.js`, `useEventForm.test.js` |
| Layout | `MainLayout.test.jsx`, `ErrorBoundary.test.jsx` |
| Services | `api.test.js`, `apiClient.test.js`, `apiServices.test.js` |
| Pages | `*.test.jsx` pour chaque page |

```bash
npm test           # run once
npm run test:watch # watch mode
```

---

## 11. Configuration & Build

### `vite.config.js`

- Plugin React (transform JSX)
- Serveur dev sur le port **5173** (accessible depuis toutes les interfaces)
- Proxy API vers microservices (voir §6)
- Production : `console.log/info/debug` supprimés (pas `error/warn`)
- Config test intégrée (Vitest + jsdom + coverage)

### `Dockerfile` + `nginx.conf`

En production, l'application est buildée puis servie par **Nginx** qui joue le rôle de reverse proxy vers la gateway backend.

---

## 12. Variables d'environnement

Fichier de référence : [`.env.example`](../.env.example)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_AUTH0_DOMAIN` | Domaine du tenant Auth0 | `dev-xxx.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | ID de l'application SPA Auth0 | `abc123` |
| `VITE_AUTH0_AUDIENCE` | Identifier API Auth0 (identique côté backend) | `https://api.unigevents.ch` |
| `VITE_API_URL` | URL de base du backend | `http://localhost:8081` |
| `VITE_API_TIMEOUT` | Timeout des requêtes (ms) | `30000` |
| `VITE_API_PROXY_TARGET` | Gateway prod (Vite proxy) | `http://gateway:8080` |
| `VITE_DEMO_MODE` | Active le mode démo | `true` / `false` |

---

## 13. Mode démo

Contrôlé par `VITE_DEMO_MODE=true` ([`src/lib/demoMode.js`](../src/lib/demoMode.js)).

**Effets :**
- Tous les guards de routes sont désactivés (navigation sans Auth0)
- Une identité fictive est injectée dans `AppContext`
- Les données de démonstration (`src/lib/sampleEvents.js`) remplacent les appels API
- Une bannière "Mode démo" est affichée dans `MainLayout`
- `sessionStorage.demoSignedOut` permet de simuler une déconnexion dans la session

---

## 14. Flux de données

### Lecture d'événements (page publique)

```
EventsPage
  └── useQuery(['events', filters])
        └── fetchEvents(params)               ← apiServices.js
              └── axiosInstance.get('/api/events')  ← apiClient.js
                    └── [intercepteur] Bearer token ajouté
                          └── Vite proxy → Events microservice :8082
```

### Création d'événement (ORGANIZER/ADMIN)

```
EventCreatePage
  └── useEventForm()                          ← hooks/useEventForm.js
        └── [submit] useApi({ method: 'POST', url: '/api/events' })
              └── axiosInstance.post(...)     ← apiClient.js
                    └── Vite proxy → Events microservice :8082
```

### Authentification au démarrage

```
main.jsx → Auth0ProviderWithConfig
  └── AppContext.jsx
        ├── useAuth0() → isAuthenticated, user, getAccessTokenSilently
        ├── fetchUserProfile() → currentUserId (UUID backend)
        └── setupAuth0Interceptor(getAccessTokenSilently) → injecte token dans Axios
```
