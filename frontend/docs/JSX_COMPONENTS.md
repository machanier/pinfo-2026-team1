# Documentation des composants React `.jsx` — `frontend/src/`

Référence complète des 41 fichiers `.jsx` (hors tests) organisés par couche applicative.

---

## Table des matières

| Catégorie | Fichiers |
|-----------|---------|
| [Point d'entrée](#1-point-dentrée) | `main.jsx`, `App.jsx` |
| [Authentification Auth0](#2-authentification-auth0) | `auth/Auth0ProviderWithConfig.jsx` |
| [Contexte global](#3-contexte-global) | `contexts/AppContextValue.jsx`, `contexts/AppContext.jsx`, `contexts/useApp.jsx` |
| [Guards de routes](#4-guards-de-routes) | `routes/AuthRouteWrappers.jsx` |
| [Layout principal](#5-layout-principal) | `layouts/MainLayout.jsx` |
| [Composants de mise en page](#6-composants-de-mise-en-page) | `Navbar.jsx`, `Sidebar.jsx`, `Footer.jsx` |
| [Composants événement](#7-composants-événement) | `EventCard.jsx`, `FavoriteButton.jsx`, `BannerUpload.jsx`, `EventFormShared.jsx` |
| [Composants modération](#composants-modération) | `moderation/OrganizerName.jsx` |
| [Primitives UI](#8-primitives-ui) | `button.jsx`, `badge.jsx` |
| [Gestion d'erreur](#9-gestion-derreur) | `ErrorBoundary.jsx` |
| [Pages — Événements](#10-pages--événements) | `HomePage`, `EventsPage`, `EventDetailPage`, `EventCreatePage`, `EventEditPage`, `MyEventsPage`, `CalendarPage` |
| [Pages — Profils](#11-pages--profils) | `ProfilePage`, `EditProfilePage`, `OrganizerProfilePage` |
| [Pages — Administration](#12-pages--administration) | `AdminModerationPage`, `AdminModerationDetailPage` |
| [Pages — Auth & Utilitaires](#13-pages--auth--utilitaires) | `LoginPage`, `NotificationsPage`, `AboutPage`, `HelpPage`, `ContactPage`, `PrivacyPage`, `NotFoundPage` |
| [Pages — Recherche & Favoris](#14-pages--recherche--favoris) | `SearchPage`, `FavoritesPage` |
| [Pages — Notifications](#15-pages--notifications) | `NotificationPreferencesPage` |

---

## 1. Point d'entrée

### `src/main.jsx`

Point d'entrée de l'application. Monte le composant racine dans `#root` et configure la hiérarchie des providers.

**Arbre des providers :**

```
StrictMode
└── BrowserRouter                      ← routing HTML5
    └── Auth0ProviderWithConfig         ← authentification Auth0
        └── QueryClientProvider         ← cache TanStack Query
            └── App                     ← routes + AppProvider
```

`QueryClient` est instancié ici (singleton) et injecté dans toute l'app via `QueryClientProvider`.

---

### `src/App.jsx`

Composant racine. Définit l'intégralité de l'arbre de routes React Router v7 et enveloppe tout dans `ErrorBoundary` puis `AppProvider`.

**Structure des routes :**

```
ErrorBoundary
└── AppProvider
    └── Routes
        ├── /login                       → LoginPage              [PublicOnlyRoute]
        ├── MainLayout (public)
        │   ├── /                        → HomePage
        │   ├── /search                  → SearchPage
        │   ├── /events/:id              → EventDetailPage
        │   ├── /organizers/:id          → OrganizerProfilePage
        │   ├── /a-propos                → AboutPage
        │   ├── /aide                    → HelpPage
        │   ├── /contact                 → ContactPage
        │   └── /confidentialite         → PrivacyPage
        ├── RequireAuthRoute > MainLayout (privé)
        │   ├── /profile                 → ProfilePage
        │   ├── /profile/edit            → EditProfilePage
        │   ├── /profile/:id             → ProfilePage
        │   ├── /profile/:id/edit        → EditProfilePage
        │   ├── /my-events               → MyEventsPage
        │   ├── /calendar                → CalendarPage
        │   ├── /favorites               → FavoritesPage
        │   ├── /events/create           → EventCreatePage        [RequireRole: ORGANIZER|ADMIN]
        │   ├── /events/edit/:id         → EventEditPage          [RequireRole: ORGANIZER|ADMIN]
        │   ├── /notifications           → NotificationsPage
        │   ├── /notifications/preferences → NotificationPreferencesPage
        │   ├── /events                  → redirect /my-events
        │   ├── /admin/moderation        → AdminModerationPage    [RequireRole: ADMIN]
        │   └── /admin/moderation/:caseId→ AdminModerationDetailPage [RequireRole: ADMIN]
        └── *                            → NotFoundPage
```

> `Auth0Provider` doit être au-dessus de `AppProvider` car `AppProvider` appelle `useAuth0()`. `ErrorBoundary` en tête attrape un crash d'initialisation Auth0 (variables d'env manquantes).

---

## 2. Authentification Auth0

### `src/auth/Auth0ProviderWithConfig.jsx`

Wrapper du provider officiel `@auth0/auth0-react` qui lit la config depuis les variables Vite et câble le callback de redirection.

**Props :** `{ children }`

**Comportement :**
- Lit `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`. Si l'un manque, **lance une erreur** au démarrage (plutôt qu'un échec silencieux).
- `cacheLocation: 'localstorage'` — tokens persistés entre reloads (choix délibéré documenté dans le fichier : évite les boucles de redirect infinies avec `memory` + refresh tokens).
- `onRedirectCallback(appState)` — après le retour Auth0, navigue vers `appState.returnTo` (mémorisé par `RequireAuthRoute`) ou `/`.
- Scope : `openid profile email` (pas `offline_access`, inutile avec localstorage).

---

## 3. Contexte global

### `src/contexts/AppContextValue.jsx`

Crée et exporte uniquement le `Context` React :

```js
export const AppContext = createContext(null)
```

Séparer la création du contexte de son provider évite les imports circulaires.

---

### `src/contexts/AppContext.jsx`

Provider central. Agrège l'état Auth0, les favoris, le mode démo et expose tout via `AppContext`.

**Export :** `AppProvider` (composant wrapper)

**État interne :**

| Variable | Source | Description |
|----------|--------|-------------|
| `savedEvents` | `localStorage` | IDs des événements favoris (initialisés depuis le storage) |
| `demoSignedOut` | `sessionStorage` | Flag de déconnexion fictive en mode démo |
| `backendUserId` | `GET /api/users/me` | UUID backend de l'utilisateur (≠ Auth0 `sub`) |

**Valeurs dérivées :**

| Valeur | Calcul |
|--------|--------|
| `isDemo` | `DEMO_MODE && !auth0IsAuthenticated && !auth0Loading` |
| `isDemoIdentity` | `isDemo && !demoSignedOut` |
| `displayName` | `auth0User.name` ou `auth0User.email` ou `DEMO_USER.name` |
| `userRole` | Claim `https://unigevents.com/roles` (tableau normalisé → string uppercase) ou `DEMO_ROLE` ou `'STUDENT'` |

**Effets :**
1. **`setApiTokenGetter` + `setupAuth0Interceptor`** — enregistre `getAccessTokenSilently` sur le singleton Axios et sur l'intercepteur `apiAuthClient` dès le montage.
2. **`backendUserId`** — fetch `GET /api/users/me` quand `auth0IsAuthenticated` passe à `true`.

**Valeur du contexte exposée :**

```js
{
  isAuthenticated, isDemo, isDemoIdentity, signInDemo,
  isLoading, user, displayName, userEmail, userId, userRole,
  currentUserId,         // UUID backend
  savedEvents, setSavedEvents, toggleFavorite, isFavorite,
  login, logout,
  getToken               // alias direct de getAccessTokenSilently
}
```

---

### `src/contexts/useApp.jsx`

Hook d'accès au contexte :

```js
export const useApp = () => useContext(AppContext)
// Lève une erreur si utilisé hors AppProvider
```

---

## 4. Guards de routes

### `src/routes/AuthRouteWrappers.jsx`

Trois composants guards exportés. Tous lisent l'état depuis `useApp()`.

> **Point critique (PINFO-190)** : pendant le retour Auth0 (`?code=…&state=…`), `isLoading` est `true` et `isAuthenticated` est encore `false`. Les guards retournent `null` pendant ce laps de temps pour éviter de réécrire l'URL et perdre les paramètres OAuth.

#### `PublicOnlyRoute({ children, redirectTo = '/' })`
- Si `isLoading` → `null`
- Si `isAuthenticated && !isDemo` → `<Navigate to={redirectTo} replace />`
- Sinon → `children`

Usage : enveloppe `/login` pour empêcher un utilisateur connecté d'y accéder.

#### `RequireAuthRoute({ children, redirectTo = '/login' })`
- Si `isLoading` → `null`
- Si `!isAuthenticated` → `<Navigate to="/login" state={{ returnTo: location.pathname+search+hash }} replace />`
- Sinon → `children`

Mémorise l'URL complète dans `state.returnTo` pour que `Auth0ProviderWithConfig.onRedirectCallback` puisse y revenir après login.

#### `RequireRoleRoute({ children, allowedRoles = [], redirectTo = '/' })`
- Si `isDemo` → `children` (mode démo = toutes les routes accessibles quel que soit le rôle)
- Si `!allowedRoles.includes(userRole)` → `<Navigate to={redirectTo} replace />`
- Sinon → `children`

---

## 5. Layout principal

### `src/layouts/MainLayout.jsx`

Gabarit de page commun. Utilisé comme layout parent dans l'arbre de routes (`<Outlet />`).

**État local :**

| Variable | Valeur initiale | Description |
|----------|----------------|-------------|
| `isSidebarOpen` | `false` | Visibilité de la sidebar sur mobile |
| `layoutMode` | `localStorage.layoutMode \|\| 'sidebar'` | Mode `'sidebar'` ou `'topbar'` |

**Comportement :**
- Affiche une bannière jaune amber en mode démo (`isDemo`).
- `useEffect([pathname])` → scroll en haut (`mainRef.current.scrollTo({ top: 0 })`) à chaque changement de route.
- `toggleLayout()` bascule entre `sidebar` et `topbar`, persiste en `localStorage`, ferme la sidebar ouverte.
- En mode `topbar` : la `Sidebar` est masquée, `Navbar` affiche les liens directement.
- Un overlay semi-transparent ferme la sidebar mobile au clic.

**Structure HTML rendue :**

```
<div h-screen flex-col>
  [bannière démo]
  <Navbar onMenuToggle layoutMode onToggleLayout />
  <div flex flex-1 overflow-hidden>
    [Sidebar isOpen onNavigate]    ← si layoutMode === 'sidebar'
    [overlay mobile]               ← si sidebar ouverte sur mobile
    <main ref={mainRef} overflow-y-auto>
      <div flex-1 p-6>
        <Outlet />                 ← contenu de la route active
      </div>
      <Footer />
    </main>
  </div>
</div>
```

---

## 6. Composants de mise en page

### `src/components/layout/Navbar.jsx`

Barre de navigation collante en haut de page.

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `onMenuToggle` | function | Ouvre/ferme la sidebar (mode sidebar) |
| `layoutMode` | `'sidebar' \| 'topbar'` | Mode de navigation actif |
| `onToggleLayout` | function | Bascule le mode |

**État local :**
- `showUserMenu` — menu déroulant utilisateur (avatar)
- `mobileNavOpen` — menu déroulant mobile en mode topbar

**Comportement :**
- Lit `displayName`, `logout`, `isAuthenticated`, `userRole`, `savedEvents` depuis `useApp()`.
- En mode **topbar + desktop** : affiche les liens `getNavLinks()` dans la barre.
- En mode **topbar + mobile** : affiche les liens dans un menu déroulant sous la navbar.
- En mode **sidebar** : le bouton hamburger appelle `onMenuToggle` (gère la sidebar dans `MainLayout`).
- Menu utilisateur : affiche l'initiale du nom, menu avec lien `/profile` et bouton déconnexion. Se ferme sur clic extérieur (`mousedown`) ou `Escape`.
- Badge favoris : compteur sur l'icône cœur si `savedEvents.length > 0`.
- Visiteur non connecté : bouton "Connexion" → `/login`.

---

### `src/components/layout/Sidebar.jsx`

Navigation latérale gauche.

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | boolean | Visible sur mobile si `true` |
| `onNavigate` | function | Callback appelé au clic sur un lien (ferme la sidebar) |

**Comportement :**
- Position fixe sur mobile (hors flux), statique sur desktop (`md:static`).
- Translation CSS `-translate-x-full` / `translate-x-0` contrôlée par `isOpen`.
- Liens issus de `getNavLinks(userRole, isAuthenticated)`.
- Link actif : fond `bg-pink-50`, texte `text-pink-700 font-semibold` (détection par `startsWith` pour les sous-routes).

---

### `src/components/layout/Footer.jsx`

Pied de page de l'application.

**Contenu :**
- Logo + tagline + icônes réseaux sociaux UNIGE (Instagram, Facebook, LinkedIn, X, YouTube) + GitHub du projet.
- Trois colonnes de liens : Explorer (`/`, `/search`, `/calendar`), Mon espace (`/profile`, `/my-events`, `/notifications`), Ressources (`/a-propos`, `/aide`, `/contact`, `/confidentialite`).
- Barre de bas de page : copyright année courante + lien `unige.ch`.

**Composants internes :**
- `FooterLink({ label, href })` — lien interne (`Link`) ou externe (`<a target="_blank">`) selon le préfixe.
- `FooterCol({ title, links })` — colonne de liens avec titre en majuscule.

---

## 7. Composants événement

### `src/components/event/EventCard.jsx`

Carte d'événement réutilisable affichée dans les grilles (homepage, recherche, calendrier).

**Props :**

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `event` | object | requis | Données de l'événement |
| `to` | string | — | Route cible ; si fourni, la carte est un `<Link>` |
| `showFavorite` | boolean | `true` | Affiche le bouton cœur |

**Champs `event` lus :** `eventId`, `title`, `category`, `time`, `place`, `capacity`, `description`, `bannerImageUrl \| bannerUrl \| imageUrl`.

**Comportement :**
- Si l'image est une URL Cloudinary → applique `cloudinaryOptimized(url, 400)` pour servir une version 800px.
- Sans image : placeholder emoji 🗓 avec fond rose.
- Bouton favori : appelle `toggleFavorite(event.eventId)` — `e.preventDefault()` + `e.stopPropagation()` pour ne pas déclencher le `Link` parent.
- Titre + catégorie en overlay sur le gradient si image présente, sinon en dessous de l'image.
- Date formatée `fr-CH` avec heure.

---

### `src/components/event/BannerUpload.jsx`

Composant d'upload de bannière avec recadrage interactif.

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `value` | string | URL Cloudinary de la bannière courante (ou `''`) |
| `onChange` | function | Appelée avec la nouvelle URL après upload réussi |
| `disabled` | boolean | Désactive le composant pendant la soumission |

**Flux d'upload :**
1. L'utilisateur sélectionne un fichier (PNG, JPG, WEBP, max 5 MB).
2. Le fichier est lu en `DataURL` et une **modal de recadrage** s'ouvre (ratio 5:2 par défaut, libre si coché).
3. Au clic "Confirmer" : le canvas dessine la zone recadrée → Blob → `uploadBannerToCloudinary()`.
4. L'URL `secure_url` retournée est passée à `onChange`.

**Constantes internes :**
- `BANNER_ASPECT = 720/288` (ratio exact de l'affichage dans `EventDetailPage`)
- `MIN_WIDTH_PX = 800`
- `ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']`

**Fonctions utilitaires internes :**
- `initCrop(w, h)` — initialise le crop centré à 90% de la largeur.
- `cropToBlob(imgEl, px)` — dessine le canvas à la résolution native et retourne un `Blob JPEG 0.95`.

**Gestion des états :**
- `uploading` — désactive les boutons, affiche "Upload en cours…".
- `error` — message d'erreur texte sous le composant.
- `srcUrl / pendingFile / crop / completedCrop / freeAspect` — état de la modal.
- Fermeture de la modal sur `Escape` (via `document.addEventListener`) ou clic sur le fond.

---

### `src/components/event/EventFormShared.jsx`

Formulaire partagé entre `EventCreatePage` et `EventEditPage`. Exporte trois composants.

#### `FormField({ id, label, required, optionalLabel, error, children })`
Enveloppe label + input enfant + message d'erreur. Usage générique pour tous les champs du formulaire.

#### `CheckboxList({ options, selected, onToggle, labelFn, spanClass, labelClass, inputClass })`
Génère une liste de cases à cocher. Utilisée pour les facultés, les filières et les niveaux de diplôme dans la section de restriction.

| Prop | Défaut | Description |
|------|--------|-------------|
| `options` | requis | Tableau des valeurs possibles |
| `selected` | requis | Tableau des valeurs cochées |
| `onToggle(opt)` | requis | Callback au changement |
| `labelFn(opt)` | `x => x` | Transforme la valeur en label affiché |

#### `EventFormBody({ form })`
Corps complet du formulaire, consomme le state retourné par `useEventForm()`.

**Sections affichées :**
1. **Bannière** — `<BannerUpload>` lié à `bannerImageUrl`/`setBannerImageUrl`.
2. **Informations générales** — grille 2 colonnes : Titre, Catégorie (select depuis `EVENT_CATEGORIES` + valeur hors-liste conservée), Lieu, Capacité, Date début (`datetime-local` avec `min` = maintenant+1 min), Date fin (optionnelle), Description (textarea), Tags (input + Enter pour ajouter, badges supprimables).
3. **Restrictions d'accès** — checkbox maître `isRestricted` ; si coché, affiche `CheckboxList` pour les facultés (`FACULTY_OPTIONS`), les filières (filtrées par facultés sélectionnées = `availableMajors`), et les niveaux de diplôme (`DEGREE_LEVELS` avec `DEGREE_LABELS`).

---

### `src/components/event/FavoriteButton.jsx`

Bouton cœur réutilisable pour mettre un événement en favori. Conçu pour être déposé à l'intérieur d'un `<Link>` (le clic est stoppé pour basculer le favori au lieu de naviguer).

**Props :**

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `eventId` | string | requis | ID de l'événement à (dé)favoriser |
| `className` | string | `''` | Classes du `<button>` |
| `iconClassName` | string | `'h-5 w-5'` | Classes de l'icône cœur |

**Comportement :**
- Lit `isFavorite`, `toggleFavorite`, `isAuthenticated`, `login` depuis `useApp()`.
- Cœur rempli rose (`fill-pink-600`) si `isFavorite(eventId)`.
- Au clic : `preventDefault` + `stopPropagation` (ne déclenche pas le `Link` parent) ; si non connecté → `login()`, sinon → `toggleFavorite(eventId)`.
- Accessibilité : `aria-pressed`, `aria-label` et `title` dynamiques.

---

## Composants modération

### `src/components/moderation/OrganizerName.jsx`

Résout et affiche le **nom lisible d'un organisateur** à partir de l'événement pointé par un cas de modération (la file affiche un nom plutôt qu'un UUID brut). Utilisé par `AdminModerationPage.jsx`.

**Props :** `eventId` (ID de l'événement) et `organizerId` (UUID de l'organisateur, fallback + cible du lien).

**Données :** `useQuery(['eventDetail', eventId])` → `fetchEventDetail(eventId)` (activée si `eventId`, `retry: false`, `staleTime: 5 min`). La clé `['eventDetail', eventId]` est **partagée** avec `AdminModerationDetailPage` (réutilisation du cache).

**Rendu :** tant que l'événement n'est pas chargé / n'existe plus → `<span>` mono avec l'UUID tronqué (`organizerId.slice(0, 8)…` ou `—`) ; sinon → `<Link to="/organizers/{organizerId}">` affichant `data.organizerName`.

---

## 8. Primitives UI

### `src/components/ui/button.jsx`

Bouton générique stylé Tailwind.

**Props :** `children`, `className`, `type = 'button'`, `variant = 'default'`, `...props`

| Variant | Apparence |
|---------|-----------|
| `'default'` | Fond noir, texte blanc, opacité au survol |
| `'ghost'` | Fond transparent, texte gris, fond gris au survol |

`disabled:opacity-50 disabled:cursor-not-allowed` intégré.

---

### `src/components/ui/badge.jsx`

Badge/tag pill.

**Props :** `children`, `className`, `variant = 'default'`, `...props`

| Variant | Apparence |
|---------|-----------|
| `'default'` | Fond indigo clair, texte indigo |
| `'secondary'` | Fond gris clair, texte gris |

Rendu : `<span>` arrondi `rounded-full` avec padding réduit.

---

## 9. Gestion d'erreur

### `src/components/ErrorBoundary.jsx`

Composant de classe React (seul type possible pour les Error Boundaries).

**Comportement :**
- `getDerivedStateFromError(error)` → `{ hasError: true, error }`
- `componentDidCatch` → `console.error`
- En cas d'erreur : affiche un bloc rouge avec le message et un bouton "Recharger la page" (`window.location.reload()`).
- En temps normal : rend `this.props.children`.

Placé à la racine de `App.jsx` pour attraper tout crash, y compris une erreur d'initialisation Auth0.

---

## 10. Pages — Événements

### `src/pages/HomePage.jsx`

Page d'accueil publique. Route : `/`

**Données :**
- `useQuery(['publicEvents', 0])` → `fetchEvents({ status: 'PUBLISHED', after: now, page: 0, size: 12 })`
- En mode démo (résultat vide) → `SAMPLE_EVENTS`

**Sections :**
1. **Accroche + barre de recherche** — soumet vers `/search?q=…`
2. **À la une** — premier événement trié par date (hero plein-largeur avec gradient)
3. **Parcourir par catégorie** — 6 tuiles `EVENT_CATEGORIES` avec icônes Lucide (`CATEGORY_ICONS`) → `/search?category=…`
4. **Prochains événements** — grille de `EventCard` (les 2ème à 12ème événements)

**États gérés :** skeleton loading (6 cartes `animate-pulse`), erreur, liste vide.

---

### `src/pages/EventsPage.jsx`

Page de recherche et filtrage. Route : `/search`

**Paramètres URL lus/écrits :**
- `?q=` — terme de recherche
- `?category=` — catégorie sélectionnée
- `?fav=1` — filtre favoris

**Données :**
- `useQuery(['publicEvents', page])` → `fetchEvents({ status: 'PUBLISHED', after: now, page, size: 12 })`
- Filtrage côté client : `search`, `category` (`categoryMatches`), `favOnly` (compare avec `savedEvents`)
- Tri : `date_asc` (défaut) ou `date_desc`

**Composants internes :**
- `Chip({ active, onClick, children })` — bouton filtre pill.

**Fonctionnalités :**
- Barre de recherche + select de tri + bouton favoris collants (sticky avec backdrop-blur).
- Chips catégories sous la barre.
- Compteur de résultats + bouton "Effacer les filtres".
- Pagination back-end (`totalPages`) visible si > 1 page et aucun filtre actif.

---

### `src/pages/EventDetailPage.jsx`

Fiche détaillée d'un événement. Route : `/events/:id`

**Données (TanStack Query + mutations) :**

| Query | Clé | Condition |
|-------|-----|-----------|
| Détail événement | `['event', id]` | toujours ; refetch toutes 30s si pas d'erreur |
| Mes inscriptions | `['my-registrations']` | si `userId && userRole === 'STUDENT'` |
| Annonces paginées | `['event-announcements', id, page]` | si `id` |

| Mutation | Action |
|----------|--------|
| `registerMutation` | `registerForEvent(id)` → met à jour `registeredCount` en cache |
| `cancelMutation` | `cancelRegistration(registrationId)` |
| `announcementMutation` | `createEventAnnouncement(id, content)` |
| `deleteAnnouncementMutation` | `deleteEventAnnouncement(id, announcementId)` |

**Sections affichées :**
- Bannière Cloudinary optimisée (`cloudinaryOptimized(url, 800)`)
- En-tête : statut (DRAFT/PUBLISHED/CANCELLED), catégorie, titre, bouton Modifier (si `canManage`)
- Infos clés : lieu, date début/fin, places restantes (couleur orange si ≤ 10, rouge si complet), organisateur linkable
- Bannière annulation (si `CANCELLED`)
- Section inscription : état de l'inscription (CONFIRMED / WAITLISTED / PENDING) ou bouton "S'inscrire" avec dialogs de confirmation
- Description (whitespace-pre-line)
- Tags
- Restrictions d'accès (si `event.restrictedTo`)
- Annonces paginées (formulaire réservé aux `canManage`)

**Variables clés :**
- `isOwner = event.requesterIsOrganizer === true`
- `canManage = isOwner || userRole === 'ADMIN'`

---

### `src/pages/EventCreatePage.jsx`

Formulaire de création d'événement. Route : `/events/create` (ORGANIZER | ADMIN)

**Flux :**
1. `validateForm()` → affiche les erreurs inline si invalide.
2. `createEvent(buildPayload())` → crée l'événement (statut DRAFT).
3. Si `bannerImageUrl` → `updateEvent(newEvent.eventId, { bannerImageUrl })` (la bannière est uploadée séparément car `createEvent` ne l'accepte pas dans le même payload).
4. Redirection vers `/my-events`.

**Gestion d'erreurs HTTP :**
- `403` → message rôle ORGANIZER requis
- `401` → session expirée

---

### `src/pages/EventEditPage.jsx`

Formulaire d'édition d'événement existant. Route : `/events/edit/:id` (ORGANIZER | ADMIN)

**Spécificités par rapport à la création :**
- Charge l'événement existant au montage (`fetchEventDetail(id)`) et pré-remplit le formulaire via `setFormData`, `setTags`, `setBannerImageUrl`, `setIsRestricted`, etc.
- `toLocalDatetime(isoString)` — convertit une date ISO en `"YYYY-MM-DDTHH:mm"` (format `datetime-local`).
- Dialog de confirmation avant sauvegarde (`ConfirmDialog` interne).
- Avertissement orange si l'événement est PUBLISHED (modification → nouvelle modération).
- Suppression de bannière via `deleteEventBanner(id)` avec bouton dédié.
- Après sauvegarde : invalide les queries `['publicEvents']` et `['myEvents']`, redirige vers `/my-events` avec un toast info si l'événement repasse en `PENDING_MODERATION`.

**Composant interne :** `ConfirmDialog({ onConfirm, onCancel })` — modale d'accessibilité (`role="dialog"`, `aria-modal`, `aria-labelledby`).

---

### `src/pages/MyEventsPage.jsx`

Page personnelle adaptée au rôle : inscriptions pour STUDENT, gestion d'événements pour ORGANIZER/ADMIN.

**Vues selon le rôle :**

#### Vue STUDENT
- `useQuery(['myRegistrations'])` → `fetchMyRegistrations({ size: 50 })`
- `useQueries(registrations.map(...))` → `fetchEventDetail` en parallèle pour enrichir chaque inscription (titre, lieu, date, catégorie)
- Cartes par inscription avec bande colorée (verte/jaune/rouge selon statut)
- Si l'événement est introuvable (404) → statut affiché = CANCELLED
- Bouton "Annuler l'inscription" (avec dialog de confirmation)

#### Vue ORGANIZER / ADMIN
- `useQuery(['myEvents'])` → `fetchEvents({ size: 50 })` avec `refetchInterval: 15s` si un événement est `PENDING_MODERATION`
- Tableau : Titre, Catégorie, Lieu, Date, Statut, Actions
- Actions par statut :
  - `DRAFT` → Modifier + Soumettre + Supprimer
  - `PENDING_MODERATION` → lecture seule + indication "Actualisation auto"
  - `PUBLISHED` → Voir + Modifier + Annuler + Annonce
  - `CANCELLED` → Voir seul
- Notifications de changement de statut détectées par polling : `PENDING_MODERATION → PUBLISHED` (vert) ou `PENDING_MODERATION → DRAFT` (orange rejeté)
- Toast info depuis navigation state (après édition d'un événement publié)

**Dialogs internes :** Annonce, Annuler événement (avec motif optionnel), Supprimer événement, Annuler inscription.

---

### `src/pages/CalendarPage.jsx`

Calendrier mensuel avec vue grille et vue chronologique. Route : `/calendar`

**État local :**

| Variable | Description |
|----------|-------------|
| `year / month` | Mois affiché |
| `selectedDay` | Jour cliqué (affiche les événements du jour sous la grille) |
| `view` | `'all'` (tous) ou `'mine'` (mes inscriptions) |
| `displayMode` | `'grid'` (calendrier) ou `'timeline'` (chronologie) |

**Données :**
- Inscriptions : `useQuery(['myRegistrations', { size: 200 }])` si `view === 'mine'`
- Grille : `useQuery(['calendarEvents', year, month])` → `fetchCalendarEvents({ from, to })`
- Chronologie : `useQuery(['publicEvents', 'timeline'])` → `fetchEvents({ status: 'PUBLISHED', size: 50 })`
- Mode démo → fallback `SAMPLE_EVENTS` filtré par mois

**`registrationMap`** : `Map<eventId, status>` (CONFIRMED ou WAITLISTED uniquement).

**Logique de grille :**
- `isoWeekDay(date)` → 0=Lun … 6=Dim (conforme à l'ISO).
- Cellules = `[...Array(firstDayOffset).fill(null), ...days]` — les `null` sont des cellules vides de début de mois.
- Chaque cellule : max 2 événements + compteur "+N autres".
- Pill de couleur par statut (`EVENT_PILL`).
- Aujourd'hui : cercle rose plein.

**Vue chronologie :** liste ordonnée avec ligne verticale rose (`border-l-2`), chaque entrée est un `Link` vers la fiche.

---

## 11. Pages — Profils

### `src/pages/ProfilePage.jsx`

Affichage du profil (propre ou d'un autre utilisateur). Route : `/profile` et `/profile/:id`

**Résolution de l'ID :**
```js
const profileId = resolveProfileId(routeId, currentUserId)
// → routeId | 'dev-self' | currentUserId (UUID) | 'me'
```

**Données :**
- `useQuery(['profile', profileId])` → `fetchProfile(profileId, userRole)` (avec sous-profil association ou étudiant)
- Si organisateur vu de l'extérieur : `useQuery(['organizerPublicEvents', id])` → `fetchEvents({ organizerId, status: 'PUBLISHED', size: 20 })`

**Affichage conditionnel selon `profileRole` :**

| Rôle | Section spécifique |
|------|--------------------|
| STUDENT | Faculté, Majeur, Niveau (3 tuiles) |
| ORGANIZER | Description de l'association |
| — | — |

**Sections communes :**
- Bandeau rose avec avatar (initiale si pas d'image) superposé.
- Badge rôle (`Badge` composant UI).
- Email et date d'inscription (si `isOwnProfile`).
- Activité : nombre de favoris (si `isOwnProfile`).
- Bouton "Éditer mon profil" → `/profile/edit` (si `isOwnProfile`).
- Événements publiés de l'organisateur (si `!isOwnProfile && isOrganizer`).

---

### `src/pages/EditProfilePage.jsx`

Formulaire d'édition du profil. Route : `/profile/edit` et `/profile/:id/edit`

**Guard interne :** vérifie `canEditThisProfile = profileId === 'me' || profileId === currentUserId` (côté frontend).

**Formulaire (champs visibles selon le rôle) :**

| Champ | Rôle | Description |
|-------|------|-------------|
| Nom affiché | Tous | `name` / `display_name` |
| Avatar (upload) | Tous | Fichier stagé, uploadé vers Cloudinary à la sauvegarde |
| Description | ORGANIZER | `association_profile.description` |
| Faculté | STUDENT | Select `FACULTY_OPTIONS` |
| Majeure | STUDENT | Select filtré par faculté (`PROGRAM_OPTIONS_BY_FACULTY`) |
| Niveau | STUDENT | `BACHELOR \| MASTER \| PHD` |

**Stratégie d'upload avatar :**
- Au `onChange` : validation de taille (`isAvatarOverSized`) + prévisualisation locale (`URL.createObjectURL`).
- À la soumission (`handleSaveProfile`) : `uploadAvatarToCloudinary(pendingAvatarFile)` → URL résolue.
- `useEffect` revoke l'object URL à chaque changement de preview (evite les fuites mémoire).

**Mutations TanStack Query :**
- `updateProfileMutation` : update user + sous-profil (via `api.put /api/users/{id}/association-profile` ou `/student-profile`).
- `deleteAccountMutation` : `deleteUser(editableProfileId)` → logout si `canEditThisProfile`.

**Zone dangereuse (suppression de compte) :**
- Modale de confirmation avec champ "retype email" (validation insensible à la casse).
- Le bouton "Supprimer" est désactivé tant que l'email n'est pas correctement saisi.
- Un ADMIN ne doit jamais supprimer son propre compte via la route d'un autre utilisateur → `canEditThisProfile` est vrai uniquement pour le compte propre.

---

### `src/pages/OrganizerProfilePage.jsx`

Page de profil d'organisateur **vue publique** (accessible depuis la navbar et les fiches d'événements). Route : `/organizers/:id`

> **État actuel :** page stub avec données fictives en dur (`organizerEvents` hardcodées). Lit `id` depuis `useParams` mais ne fait pas d'appel API.

À terme, cette page devrait appeler `fetchProfile(id)` et afficher le profil complet de l'organisateur (logo, description, événements publiés). Voir `ProfilePage` pour l'implémentation complète côté utilisateur connecté.

---

## 12. Pages — Administration

### `src/pages/AdminModerationPage.jsx`

Liste paginée de la file de modération. Route : `/admin/moderation` (ADMIN uniquement)

**Données :**
- `useQuery(['moderationQueue', status, page])` → `fetchModerationQueue({ status, page, size: 20 })`

**Onglets de statut :** PENDING | AUTO_APPROVED | APPROVED | REJECTED (changer d'onglet remet `page` à 0).

**Tableau :** Titre (lien vers le détail), Organisateur (UUID tronqué), Statut (badge coloré), Créé le, bouton Examiner.

**Toast de succès :** lu depuis `location.state.toastSuccess` (injecté par `AdminModerationDetailPage` après une décision).

---

### `src/pages/AdminModerationDetailPage.jsx`

Vue détaillée d'un cas de modération et formulaires d'approbation/rejet. Route : `/admin/moderation/:caseId` (ADMIN uniquement)

**Données :**
- `useQuery(['moderationCase', caseId])` → `fetchModerationCase(caseId)`
- `useQuery(['eventDetail', moderationCase.eventId])` → `fetchEventDetail(...)` (activée après que `moderationCase` est chargé)

**Composant interne :** `ConfidenceBar({ value })` — barre de progression colorée (rouge ≥ 80%, orange ≥ 50%, jaune sinon).

**Sections :**
1. **Carte du cas** : titre, ID cas, organisateur (UUID), date de soumission, note admin, motif de rejet si rejeté.
2. **Contenu de l'événement** : bannière, description, dates, lieu, capacité, catégorie, tags.
3. **Signaux IA** (`flags[]`) : liste des raisons + champ concerné + `ConfidenceBar`. Message "Aucun signal" si tableau vide.
4. **Formulaires de décision** (uniquement si statut `PENDING`) :
   - Panneau vert Approuver : note interne optionnelle + submit → `approveModerationCase(caseId, note)`.
   - Panneau rouge Rejeter : bouton initial → formulaire déroulé avec motif obligatoire → `rejectModerationCase(caseId, reason)`.
5. **Bannière "déjà traité"** si statut ≠ PENDING.

Après décision : invalide `['moderationQueue']` et `['moderationCase', caseId]`, navigue vers `/admin/moderation` avec `state.toastSuccess`.

---

## 13. Pages — Auth & Utilitaires

### `src/pages/LoginPage.jsx`

Page de connexion avec aperçu des événements publics. Route : `/login`

**Particularités :**
- Ce n'est **pas** une page dans `MainLayout` → affiche son propre `<Footer>`.
- Affiche les événements publics (`fetchPublicEvents`) en arrière-plan pendant que l'utilisateur n'est pas connecté.
- `useEffect([isAuthenticated])` → si déjà connecté, redirige immédiatement vers `returnTo`.

**Boutons de connexion :**

| Bouton | Action Auth0 |
|--------|-------------|
| Se connecter | `loginWithRedirect()` |
| Créer un compte | `loginWithRedirect({ screen_hint: 'signup' })` |
| Continuer avec Google | `loginWithRedirect({ connection: 'google-oauth2' })` |

En mode démo : `signInDemo()` + navigation vers `returnTo` (sans appel Auth0).

**Composant interne :** `GoogleIcon({ className })` — SVG inline du logo Google multicolore.

---

### `src/pages/NotificationsPage.jsx`

Page de notifications. Route : `/notifications`

> **État actuel :** données fictives en dur (`NOTIFICATIONS` hardcodées). Interface fonctionnelle mais sans connexion au backend de notifications.

Affiche une liste de notifications typées (alerte, confirmation, annonce, info) avec icône et badge colorés (`TYPE_META`).

---

### `src/pages/AboutPage.jsx`

Page statique "À propos". Route : `/a-propos`

Contenu textuel présentant UNIGEvents et son contexte (projet étudiant PINFO, UNIGE).

---

### `src/pages/HelpPage.jsx`

Page FAQ. Route : `/aide`

Liste de 4 questions/réponses sous forme `<dl>`. Aucune dépendance externe.

---

### `src/pages/ContactPage.jsx`

Page de contact. Route : `/contact`

Deux cartes : email (`mailto:contact@unigevents.ch`) et adresse physique UNIGE.

---

### `src/pages/PrivacyPage.jsx`

Page de politique de confidentialité. Route : `/confidentialite`

Contenu statique (mention explicite que c'est un projet étudiant, pas une politique officielle).

---

### `src/pages/NotFoundPage.jsx`

Page 404. Route : `*`

Design glassmorphism avec fond dégradé rose, blobs floutés en arrière-plan. Lien "Retour à l'accueil" → `/`. Aucune dépendance d'état.

---

## 14. Pages — Recherche & Favoris

### `src/pages/SearchPage.jsx`

Page de recherche avancée d'événements et d'organisateurs. Route : `/search` (publique). **Tout l'état de recherche vit dans l'URL** (`useSearchParams`), sauf la valeur de l'input (frappe immédiate, debounce vers l'URL).

**Paramètres URL :** `q`, `category`, `from`/`to`, `place`, `faculty`/`degree`, `organizer`, `slots` (`1` = places disponibles), `sort` (`date_asc`/`date_desc`), `page`, `fav` (`1` = favoris).

**Debounce (`useDebounce`) :** 200 ms pour les suggestions, 400 ms pour pousser le terme vers l'URL.

**Onglets :** `events` (défaut) ou `organizers` — la requête active dépend de l'onglet.

**Données :**

| Query | Clé | Condition |
|-------|-----|-----------|
| Suggestions | `['eventSuggestions', q]` | `q.length >= 2` (`fetchEventSuggestions`) |
| Recherche événements | `['searchEvents', …filtres…, page]` | onglet `events` (`searchEvents`, `keepPreviousData`) |
| Recherche organisateurs | `['searchOrganizers', q, page]` | onglet `organizers` (`searchOrganizers`) |

La réponse `searchEvents` fournit `content`, `totalPages`, `totalElements` et `facets` (compteurs par catégorie/lieu).

**Composants internes :** `FilterSection`, `FilterSidebar` (tri, catégories `EVENT_CATEGORIES` avec compteur de facette — catégories sans résultat grisées, période, lieu, faculté + filière `PROGRAM_OPTIONS_BY_FACULTY`, niveau `DEGREE_LABELS`, « places disponibles », réinitialisation), `Pill` (filtre actif supprimable).

**UI :** barre de recherche avec autocomplétion, sidebar de filtres sticky (panneau dépliable sur mobile), pills des filtres actifs, résultats événements (avec `FavoriteButton` + places restantes / badge « Complet ») ou organisateurs (lien `/organizers/:id`, badge « Vérifié »), pagination back-end avec ellipses.

---

### `src/pages/FavoritesPage.jsx`

Page dédiée « Mes favoris ». Route : `/favorites` (privée — l'icône cœur de la navbar pointe ici).

**Données :** les favoris sont une liste d'IDs côté client (`savedEvents` depuis `useApp()`, adossée à `localStorage`) ; `useQueries(savedEvents.map(...))` → `fetchEventDetail(id)` en parallèle (`retry: false`). Les favoris dont l'événement n'existe plus (404) sont filtrés.

**États :** liste vide → état illustré + bouton « Explorer les événements » (`/search`) ; chargement → grille de squelettes ; tous introuvables → message dédié ; sinon → grille de `EventCard`.

---

## 15. Pages — Notifications

### `src/pages/NotificationPreferencesPage.jsx`

Formulaire de préférences d'emails de notification. Route : `/notifications/preferences` (privée).

**Données :** `useNotificationPreferences()` → `{ data: prefs, isLoading, error, update, isUpdating, isUpdateSuccess, updateError }`.

**État local :** `local` (copie éditable, `null` tant qu'aucune modif), `values = local ?? prefs`, `isDirty` (vrai seulement si une valeur diffère réellement de `prefs`), `masterOn` (état de `emailEnabled`).

**Réglages :** interrupteur maître `emailEnabled` (coupe et grise tous les types) ; bascules par type (`PER_TYPE_LABELS` : annonces, mises à jour, annulations, confirmation d'inscription, place libérée) ; select `reminderLeadTimeHours` (`REMINDER_OPTIONS`, affiché si présent dans `prefs`).

**Enregistrement :** `save()` → `update(values)` puis `local = null` ; message de statut `aria-live` (succès/échec).

**Garde-fou :** `useUnsavedChangesGuard(isDirty)` bloque rafraîchissement, liens internes et bouton Précédent tant que `isDirty`.

**Composant interne :** `Switch` (`role="switch"`, `aria-checked`).

---

## Relations entre composants

```
main.jsx
└── Auth0ProviderWithConfig
    └── QueryClientProvider
        └── App.jsx (routes)
            └── AppProvider (AppContext.jsx)
                ├── [guards: AuthRouteWrappers.jsx]
                └── MainLayout.jsx
                    ├── Navbar.jsx ←→ navItems.js ←→ useApp()
                    ├── Sidebar.jsx ←→ navItems.js ←→ useApp()
                    ├── <Outlet> (pages)
                    │   ├── EventCard.jsx ← useApp() (favoris) + cloudinaryAvatar.js
                    │   ├── BannerUpload.jsx ← cloudinaryBanner.js
                    │   ├── EventFormShared.jsx ← BannerUpload + universityData + categories
                    │   ├── Badge.jsx, Button.jsx (primitives)
                    │   └── ErrorBoundary.jsx (wrapper global)
                    └── Footer.jsx
```

### Dépendances des pages vers les composants

| Page | Composants utilisés |
|------|---------------------|
| `HomePage` | `EventCard` |
| `EventsPage` | `EventCard` |
| `LoginPage` | `EventCard`, `Footer` |
| `EventDetailPage` | — (JSX inline uniquement) |
| `EventCreatePage` | `EventFormShared`, `Button` |
| `EventEditPage` | `EventFormShared`, `Button` |
| `ProfilePage` | `Badge` |
| `EditProfilePage` | `Button` |
| `AdminModerationDetailPage` | `ConfidenceBar` (interne) |
| `MyEventsPage` | — (dialogs internes) |
| `CalendarPage` | — |

### Pages entièrement statiques (aucune dépendance d'état)

`AboutPage`, `HelpPage`, `ContactPage`, `PrivacyPage`, `NotFoundPage`
