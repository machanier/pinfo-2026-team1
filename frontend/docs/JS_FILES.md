# Documentation des fichiers `.js` — `frontend/src/`

Référence exhaustive de tous les fichiers `.js` (hors tests) présents dans `src/`.
Les fichiers `.jsx` (composants React) ne sont pas couverts ici.

---

## Table des matières

| Fichier | Rôle résumé |
|---------|-------------|
| [`src/setupTests.js`](#srcsettuptestsjs) | Bootstrap Vitest — stubs globaux pour tous les tests |
| [`src/auth/apiClient.js`](#srcauthapiClientjs) | Hook React `useApiClient()` — instance Axios par composant |
| [`src/components/layout/navItems.js`](#srccomponentslayoutnavitemsjs) | Déclaration des liens de navigation + fonction de filtrage par rôle |
| [`src/hooks/useApi.js`](#srchooksuseapijs) | Hook `useApi` — requêtes API impératives avec état loading/error/data |
| [`src/hooks/useEventForm.js`](#srchooksuseeventformjs) | Hook `useEventForm` — état complet du formulaire création/édition d'événement |
| [`src/lib/api.js`](#srclibapijs) | Deux instances Axios + intercepteurs Auth0 + fonctions HTTP helpers |
| [`src/lib/apiClient.js`](#srclibapiClientjs) | Instance Axios singleton — utilisée hors React (TanStack Query callbacks, etc.) |
| [`src/lib/apiServices.js`](#srclibapiservicesjs) | Toutes les fonctions métier d'appel backend (événements, users, modération…) |
| [`src/lib/categories.js`](#srclibcategoriesjs) | Constante `EVENT_CATEGORIES` + helper de comparaison |
| [`src/lib/cloudinaryAvatar.js`](#srclibcloudineryavatarjs) | Upload signé d'avatar vers Cloudinary |
| [`src/lib/cloudinaryBanner.js`](#srclibcloudinerybannerjs) | Upload signé de bannière vers Cloudinary |
| [`src/lib/demoMode.js`](#srclibdemomodejs) | Feature flag `DEMO_MODE` + identité fictive |
| [`src/lib/profileUtils.js`](#srclibprofileutilsjs) | Chargement et mise à jour du profil utilisateur (réel + mock) |
| [`src/lib/sampleEvents.js`](#srclibsampleeventsjs) | Événements fictifs pour le mode démo |
| [`src/lib/universityData.js`](#srclibuniversitydatajs) | Référentiel UNIGE — facultés, filières, niveaux de diplôme |

---

## `src/setupTests.js`

**Rôle :** Fichier d'initialisation global exécuté automatiquement avant chaque suite de tests Vitest.

**Ce qu'il fait :**

| Action | Détail |
|--------|--------|
| Stub variables Auth0 | `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` → valeurs de test |
| Stub variables Cloudinary | `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_BANNER_UPLOAD_PRESET`, `VITE_CLOUDINARY_UPLOAD_PRESET` |
| Mock `demoMode.js` | Force `DEMO_MODE: false` pour que les tests exercent le vrai comportement auth |
| `localStorage` / `sessionStorage` | Remplace les implémentations jsdom défaillantes par un store mémoire |
| `Element.prototype.scrollTo` / `window.scrollTo` | Stub no-op (jsdom ne les implémente pas, `MainLayout` les appelle à chaque navigation) |
| `afterEach(cleanup)` | Démonte les arbres React après chaque test |

**Dépendances :** `@testing-library/jest-dom/vitest`, `@testing-library/react`, `vitest`

---

## `src/auth/apiClient.js`

**Rôle :** Fournit le hook `useApiClient()` — une instance Axios fraîche par composant qui attache automatiquement le token Auth0 à chaque requête.

**Export principal :**

```js
export function useApiClient(): AxiosInstance
```

**Comportement :**
- Créé avec `useMemo` → stable entre les renders d'un même composant, recréé si `getAccessTokenSilently` change.
- L'intercepteur de requête appelle `getAccessTokenSilently()` (token en cache ou refresh silencieux) et injecte `Authorization: Bearer <token>`.
- Si `getAccessTokenSilently` échoue (cookie effacé, refresh token mort), la requête part **sans token** — c'est volontaire : un background poll (ex. notifications) ne doit pas déclencher une redirection de navigation.
- Pas de `baseURL` : les appelants passent des chemins complets (`/api/users/me`) alignés avec la config Nginx/Kong.
- Timeout : 10 s.

**Différence avec `src/lib/apiClient.js` :** ce hook est réservé aux composants React (il appelle `useAuth0()`). Le singleton de `lib/` est pour le code hors-render.

---

## `src/components/layout/navItems.js`

**Rôle :** Source unique de vérité pour les liens de navigation, partagée entre `Sidebar.jsx` et `Navbar.jsx`.

**Exports :**

```js
export const studentLinks: NavLink[]    // liens pour STUDENT
export const organizerLinks: NavLink[]  // liens pour ORGANIZER / ADMIN
export function getNavLinks(role, isAuthenticated): NavLink[]
```

**Structure d'un lien :**

| Champ | Type | Description |
|-------|------|-------------|
| `to` | string | Chemin de route |
| `label` | string | Texte affiché |
| `icon` | LucideIcon | Icône Lucide React |
| `public` | boolean (opt.) | Visible pour les visiteurs non connectés |
| `adminOnly` | boolean (opt.) | Masqué pour les ORGANIZER (visible uniquement ADMIN) |

**Logique de `getNavLinks(role, isAuthenticated)` :**
1. Choisit `organizerLinks` si `role === 'ORGANIZER' || role === 'ADMIN'`, sinon `studentLinks`.
2. Filtre les liens non-`public` si `isAuthenticated === false`.
3. Filtre les liens `adminOnly` si `role !== 'ADMIN'`.

**Liens `studentLinks` :** Accueil, Recherche, Mes Inscriptions, Calendrier.

**Liens `organizerLinks` :** Accueil, Recherche, Mes Événements, Nouvel Événement, Modération (adminOnly).

---

## `src/hooks/useApi.js`

**Rôle :** Hook React pour exécuter des requêtes API authentifiées de manière impérative, avec gestion automatique de l'état `isLoading / error / data`.

**Signature :**

```js
export const useApi = (options?: {
  method?: string       // méthode HTTP par défaut (défaut: 'GET')
  endpoint?: string     // endpoint par défaut
  autoFetch?: boolean   // déclencher GET au montage (défaut: false)
}): { data, error, isLoading, execute, reset }
```

**Fonction `execute` :**

```js
execute(method, endpoint, payload?, requestOptions?): Promise<data>
```

- Récupère le token via `getToken()` (depuis `AppContext`).
- Ajoute manuellement `Authorization: Bearer <token>` (en plus de l'intercepteur global — double sécurité).
- Pour `POST` / `PUT`, place `payload` dans `config.data`.
- En mode DEV, log `console.debug` la requête.
- En cas d'erreur, construit un objet `{ message, status, endpoint, method }` et le place dans `error`.
- Relance toujours l'erreur (`throw err`) pour que l'appelant puisse l'intercepter.

**Fonction `reset` :** remet `data`, `error`, `isLoading` à leur valeur initiale.

**`autoFetch` :** si `true` + `endpoint` défini + méthode `GET`, déclenche `execute` dans un `setTimeout(0)` au montage (évite un appel synchrone dans le cycle de rendu).

**Dépendances :** `src/lib/api.js` (`apiAuthClient`), `src/contexts/useApp.jsx`

---

## `src/hooks/useEventForm.js`

**Rôle :** Centralise tout l'état et la logique du formulaire de création/édition d'événement, partagé entre `EventCreatePage.jsx` et `EventEditPage.jsx`.

**Export :**

```js
export function useEventForm(): FormState
```

**État géré :**

| Variable | Type | Description |
|----------|------|-------------|
| `formData` | object | Champs textuels : `title`, `category`, `time`, `endTime`, `place`, `capacity`, `description` |
| `tags` / `tagInput` | string[] / string | Tags de l'événement + valeur du champ de saisie |
| `isRestricted` | boolean | L'événement a-t-il des restrictions d'accès ? |
| `selectedFaculties` | string[] | Facultés sélectionnées pour la restriction |
| `selectedMajors` | string[] | Filières sélectionnées (sous-ensemble de `selectedFaculties`) |
| `selectedDegreeLevels` | string[] | Niveaux de diplôme (`BACHELOR`, `MASTER`, `PHD`) |
| `bannerImageUrl` | string | URL Cloudinary de la bannière |
| `errors` | object | Erreurs de validation par champ |
| `submitError` | string | Message d'erreur global à la soumission |
| `isSubmitting` | boolean | Requête de soumission en cours |

**Fonctions clés :**

| Fonction | Description |
|----------|-------------|
| `validateForm()` | Valide tous les champs obligatoires, les dates (future, cohérence start/end) ; retourne un objet d'erreurs |
| `handleChange(e)` | Met à jour `formData` et efface l'erreur du champ modifié |
| `addTag(value)` / `removeTag(tag)` | Gestion des tags (dédupliqués) |
| `handleTagKeyDown(e)` | Soumet le tag courant sur `Enter` |
| `toggleFaculty(faculty)` | Ajoute/retire une faculté et purge les filières devenues invalides |
| `toggleMajor(major)` / `toggleDegreeLevel(level)` | Toggle des filtres de restriction |
| `fieldCls(hasError)` | Retourne les classes Tailwind du champ selon son état d'erreur |
| `buildPayload()` | Construit le payload JSON à envoyer au backend (ISO dates, `restrictedTo` conditionnel) |

**`availableMajors` :** calculé à la volée — union des filières des facultés sélectionnées (via `PROGRAM_OPTIONS_BY_FACULTY`).

---

## `src/lib/api.js`

**Rôle :** Fournit deux instances Axios et le mécanisme d'initialisation de l'intercepteur Auth0, ainsi que des fonctions HTTP raccourcies.

### Instances Axios

| Export | Description |
|--------|-------------|
| `apiClient` | Instance **non authentifiée** — pour les requêtes publiques (ex. `fetchPublicEvents`) |
| `apiAuthClient` | Instance **authentifiée** — intercepteurs Auth0 attachés via `setupAuth0Interceptor()` |

Les deux utilisent `VITE_API_URL` comme `baseURL` et `VITE_API_TIMEOUT` (défaut 30 s).

### `setupAuth0Interceptor(getAccessTokenSilently)`

Appelée **une seule fois** par `AppContext` au montage. Configure deux intercepteurs sur `apiAuthClient` :

**Intercepteur de requête :**
- Appelle `getAccessTokenSilently({ audience, scope })`.
- Injecte `Authorization: Bearer <token>`.
- En cas d'échec, laisse la requête partir sans token (le backend répond 401).
- Éjecte les anciens intercepteurs si appelée à nouveau (re-initialisation propre).

**Intercepteur de réponse :**
- `401` → log warn (Auth0 gère le refresh ; un 401 ici est une vraie erreur).
- `403` → log warn.
- `404` → log via `console.warn` (condition normale, ex. ressource supprimée).
- Autres erreurs → `console.error`.
- Retourne une fonction de nettoyage qui éjecte les deux intercepteurs.

### Fonctions HTTP helpers

Wrappers sur `apiAuthClient` qui extraient `response.data` et gèrent les erreurs :

| Fonction | Méthode |
|----------|---------|
| `apiGet(endpoint, options?)` | GET |
| `apiPost(endpoint, data?, options?)` | POST |
| `apiPut(endpoint, data?, options?)` | PUT |
| `apiPatch(endpoint, data?, options?)` | PATCH |
| `apiDelete(endpoint, options?)` | DELETE |

`apiGet` traite les `404` comme `console.warn` au lieu de `console.error` (cohérent avec l'intercepteur).

---

## `src/lib/apiClient.js`

**Rôle :** Instance Axios **singleton** partagée pour le code qui s'exécute **hors du cycle de rendu React** — notamment les `queryFn` de TanStack Query et les fonctions de `profileUtils.js`.

**Pourquoi un singleton séparé ?** Les hooks React (`useApiClient`, `useAuth0`) ne peuvent pas être appelés depuis des callbacks passés à `useQuery`. Ce singleton comble ce besoin.

**Mécanisme de token :**

```js
export function setApiTokenGetter(fn): void
```

`AppContext` appelle `setApiTokenGetter(getAccessTokenSilently)` après le chargement Auth0. L'intercepteur de requête appelle ensuite `tokenGetter()` à chaque requête pour obtenir le token à jour.

**Sans `tokenGetter` enregistré** (tests unitaires sans provider) : la requête part non authentifiée et Kong répond 401 — comportement de fallback identique à `useApiClient`.

**Config :** `baseURL: ''`, timeout 10 s.

---

## `src/lib/apiServices.js`

**Rôle :** Bibliothèque de toutes les fonctions d'appel au backend, organisées par domaine métier.

> Toutes ces fonctions utilisent les helpers de `src/lib/api.js` (`apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`), sauf `fetchPublicEvents` qui utilise `apiClient` (non authentifié).

### Utilisateurs

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `fetchUserProfile()` | GET | `/api/users/me` | Profil de l'utilisateur connecté |
| `updateUserProfile(userId, updates)` | PUT | `/api/users/{id}` | Mise à jour du profil |
| `deleteUser(userId)` | DELETE | `/api/users/{id}` | Soft-delete du compte |

### Événements

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `fetchEvents(filters?)` | GET | `/api/events` | Liste paginée (authentifié) |
| `fetchPublicEvents(filters?)` | GET | `/api/events` | Liste publique (sans token) |
| `fetchEventDetail(eventId)` | GET | `/api/events/{id}` | Détail d'un événement |
| `createEvent(eventData)` | POST | `/api/events` | Création d'un événement |
| `updateEvent(eventId, data)` | PUT | `/api/events/{id}` | Mise à jour |
| `deleteEvent(eventId)` | DELETE | `/api/events/{id}` | Suppression |
| `submitEvent(eventId)` | PATCH | `/api/events/{id}/submit` | Soumet pour modération |
| `cancelEvent(eventId, reason?)` | PATCH | `/api/events/{id}/cancel` | Annulation |

### Inscriptions

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `fetchMyRegistrations(filters?)` | GET | `/api/registrations/me` | Inscriptions de l'utilisateur |
| `registerForEvent(eventId)` | POST | `/api/registrations` | Inscription à un événement |
| `cancelRegistration(registrationId)` | DELETE | `/api/registrations/{id}` | Annulation d'inscription |

Codes d'erreur gérés spécifiquement pour `registerForEvent` : `409` (déjà inscrit), `403` (conditions non remplies), `400` (état invalide).

### Calendrier

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `fetchCalendarEvents({ from, to, organizerId? })` | GET | `/api/events/calendar` | Événements sur une plage de dates |

### Annonces d'événement

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `fetchEventAnnouncements(eventId, page, size)` | GET | `/api/events/{id}/announcements` | Liste paginée des annonces |
| `createEventAnnouncement(eventId, content)` | POST | `/api/events/{id}/announcements` | Création d'une annonce |
| `deleteEventAnnouncement(eventId, announcementId)` | DELETE | `/api/events/{id}/announcements/{aid}` | Suppression |

### Modération (ADMIN uniquement)

| Fonction | Méthode | Endpoint | Description |
|----------|---------|----------|-------------|
| `fetchModerationQueue({ status, page, size })` | GET | `/api/moderation/queue` | File de modération paginée |
| `fetchModerationCase(caseId)` | GET | `/api/moderation/queue/{id}` | Détail d'un cas |
| `approveModerationCase(caseId, adminNote?)` | PATCH | `/api/moderation/queue/{id}/approve` | Approbation |
| `rejectModerationCase(caseId, reason)` | PATCH | `/api/moderation/queue/{id}/reject` | Rejet (motif obligatoire) |

Toutes ces fonctions gèrent `403` (accès refusé), `404` (introuvable) et `409` (cas déjà traité).

### Bannière

| Fonction | Méthode | Endpoint |
|----------|---------|----------|
| `deleteEventBanner(eventId)` | DELETE | `/api/events/{id}/banner` |

### Utilitaires de connectivité

| Fonction | Description |
|----------|-------------|
| `pingBackend()` | Teste la connectivité en essayant `/q/health`, `/api/health`, `/health` |
| `testAuthentication()` | Alias de `GET /api/users/me` pour vérifier que le token est valide |

---

## `src/lib/categories.js`

**Rôle :** Source unique de vérité pour les catégories d'événements.

**Exports :**

```js
export const EVENT_CATEGORIES: string[]
// ['Conférence', 'Sport', 'Plein air', 'Carrière', 'Bien-être', 'Musique']

export function categoryMatches(eventCategory: string, selected: string): boolean
```

`categoryMatches` effectue une comparaison insensible à la casse et aux espaces — utile pour filtrer des événements dont le champ `category` peut contenir des variantes de formatage.

**Utilisé par :** `HomePage.jsx` (icônes de catégorie), `EventsPage.jsx` (filtres), `useEventForm.js` (validation).

---

## `src/lib/cloudinaryAvatar.js`

**Rôle :** Gère l'upload signé d'avatars utilisateur vers Cloudinary.

### Flux d'upload en deux étapes

```
1. POST /api/users/me/avatar-upload-signature  →  { signature, cloudName, apiKey,
                                                    timestamp, publicId, overwrite,
                                                    uploadPreset }
2. POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload
   (FormData avec tous les champs signés + le fichier)
   →  { secure_url, ... }
```

Le secret API Cloudinary ne quitte jamais le serveur. Un upload non signé est refusé par Cloudinary.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `MAX_AVATAR_BYTES` | `2_000_000` | Taille max (2 MB) |
| `formatAvatarSize(bytes)` | fonction | `"1.5 MB"` |
| `avatarTooLargeMessage(bytes)` | fonction | Message utilisateur localisé |
| `isAvatarOverSized(file)` | fonction | `file.size > MAX_AVATAR_BYTES` |
| `uploadAvatarToCloudinary(file)` | async | Retourne `secure_url` (string) |
| `cloudinaryOptimized(url, width?)` | fonction | Injecte des transformations Cloudinary (`w_`, `q_auto:best`, `f_auto`) pour la résolution d'affichage |

**Erreurs gérées dans `uploadAvatarToCloudinary` :**
- Fichier trop grand → erreur avant la requête réseau.
- `429` sur l'endpoint de signature → message de rate-limit.
- Signature incomplète → erreur de validation locale.
- Réponse Cloudinary non-ok → relaye le message d'erreur Cloudinary.
- Pas de `secure_url` dans la réponse → erreur explicite.

**`cloudinaryOptimized`** insère `w_{width*2},q_auto:best,f_auto` après `/upload/` pour servir des images retina au bon format (WebP/AVIF si supporté).

---

## `src/lib/cloudinaryBanner.js`

**Rôle :** Gère l'upload signé de bannières d'événements vers Cloudinary. Suit le même pattern signé que `cloudinaryAvatar.js`.

### Différences par rapport à l'avatar

| Aspect | Avatar | Bannière |
|--------|--------|----------|
| Endpoint de signature | `/api/users/me/avatar-upload-signature` | `/api/events/banner-upload-signature` |
| Taille max | 2 MB | 5 MB |
| Paramètre fichier | `file` (File) | `fileOrBlob, filename` (Blob + nom) |
| Rôle requis | Utilisateur connecté | ORGANIZER ou ADMIN |
| Erreur 503 | — | Cloudinary non configuré côté serveur |

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `MAX_BANNER_BYTES` | `5_000_000` | Taille max (5 MB) |
| `formatBannerSize(bytes)` | fonction | `"3.2 MB"` |
| `bannerTooLargeMessage(bytes)` | fonction | Message utilisateur localisé |
| `isBannerOverSized(file)` | fonction | `file.size > MAX_BANNER_BYTES` |
| `uploadBannerToCloudinary(fileOrBlob, filename)` | async | Retourne le payload Cloudinary complet (`{ secure_url, ... }`) |

> Contrairement à `uploadAvatarToCloudinary`, cette fonction retourne le payload entier (pas seulement `secure_url`), ce qui permet à l'appelant d'accéder aux métadonnées Cloudinary.

---

## `src/lib/demoMode.js`

**Rôle :** Feature flag pour le mode démo/preview. Contrôle si l'application s'exécute sans backend ni Auth0.

**Exports :**

```js
export const DEMO_MODE: boolean  // true si VITE_DEMO_MODE === 'true'
export const DEMO_ROLE: string   // VITE_DEMO_ROLE || 'STUDENT' (uppercased)
export const DEMO_USER: { name: string, email: string }
// { name: 'Camille Démo', email: 'camille.demo@etu.unige.ch' }
```

**Effet de `DEMO_MODE = true` :**
- `AppContext.jsx` injecte `DEMO_USER` comme identité fictive.
- `AuthRouteWrappers.jsx` désactive tous les guards (navigation libre sans login).
- `profileUtils.js` redirige vers `buildMockProfile()` au lieu d'appeler le backend.
- `MainLayout.jsx` affiche une bannière "Mode démo".

**`DEMO_ROLE`** peut être surchargé via `VITE_DEMO_ROLE=ORGANIZER` pour prévisualiser les vues organisateur ou admin.

---

## `src/lib/profileUtils.js`

**Rôle :** Logique complète de chargement et mise à jour du profil utilisateur, avec support du mode mock/démo.

### Exports

#### `shouldUseMockProfileApi(): boolean`
Retourne `true` si `VITE_PROFILE_MOCK=true` ou `DEMO_MODE=true`. Active les données fictives.

#### `buildMockProfile(role, profileId): object`
Construit un profil fictif selon le rôle :
- `STUDENT` : Camille Démo, Faculté Sciences, Informatique, BACHELOR.
- `ORGANIZER` : Association Campus.
- `ADMIN` : Admin UniEvents.

#### `formatDate(dateValue): string`
Formate une date ISO en français suisse (`fr-CH`) — ex. `"2 juin 2026"`. Retourne `'Date inconnue'` si la valeur est absente ou invalide.

#### `normalizeProfileData(data, fallbackRole): NormalizedProfile`
Normalise les champs retournés par le backend (gère les variantes de nommage `avatar_url` / `avatarUrl`, `created_at` / `createdAt`, etc.) en un objet cohérent :

```js
{ id, email, role, display_name, avatar_url, created_at, student_profile, association_profile }
```

#### `resolveProfileId(routeId, currentUserId): string`
Détermine l'ID à utiliser pour charger un profil :
1. Si `routeId` est fourni (route `/profile/:id`) → l'utilise.
2. Si `mockModeEnabled` → `'dev-self'`.
3. Si `currentUserId` est un UUID valide → l'utilise.
4. Fallback → `'me'` (le backend retourne le profil de l'utilisateur connecté).

#### `fetchProfile(profileId, userRole): Promise<object>`
Charge le profil complet avec le sous-profil approprié :
- Si mock → `buildMockProfile()`.
- Sinon :
  - `GET /api/users/me` ou `GET /api/users/{id}`.
  - Si `ORGANIZER` → tente `GET /api/users/{id}/association-profile` (ignore 404).
  - Sinon → tente `GET /api/users/{id}/student-profile` (ignore 404).

#### `updateProfile(userId, profileData): Promise<object>`
Met à jour le profil utilisateur :
- Normalise les noms de champs (`name` / `display_name`, `avatarUrl` / `avatar_url`).
- Valide que `avatarUrl` utilise HTTPS (supprime sinon).
- Si mock → retourne un objet simulé sans appel réseau.
- Sinon → `PUT /api/users/{id}`.

---

## `src/lib/sampleEvents.js`

**Rôle :** Données d'événements fictifs pour le mode démo, couvrant les 6 catégories de l'application.

**Export :**

```js
export const SAMPLE_EVENTS: Event[]
```

**Structure de chaque événement :**

| Champ | Type | Exemple |
|-------|------|---------|
| `eventId` | string | `'demo-1'` |
| `title` | string | `'Conférence publique : intelligence artificielle et société'` |
| `category` | string | `'Conférence'` (l'une des 6 catégories de `categories.js`) |
| `time` | string (ISO) | `'2026-05-26T18:30:00'` |
| `place` | string | `'Uni Dufour, Auditoire U300'` |
| `capacity` | number | `300` |
| `description` | string | Texte descriptif |
| `bannerUrl` | string | URL Unsplash ou loremflickr |

Les 6 événements couvrent : Conférence, Sport, Plein air, Carrière, Bien-être, Musique — dans des lieux UNIGE réels (Uni Dufour, Uni Mail, Bastions, Champel…).

---

## `src/lib/universityData.js`

**Rôle :** Référentiel statique de l'Université de Genève — source unique de vérité pour les facultés, filières et niveaux de diplôme utilisés dans les restrictions d'accès aux événements.

**Exports :**

### `FACULTY_OPTIONS: string[]`
Les 13 facultés et instituts de l'UNIGE :
- Faculté des sciences, Faculté de médecine, Faculté des lettres, SdS, GSEM, Droit, Théologie, FPSE, FTI, GSI, CUI, ISE, IUFE.

### `PROGRAM_OPTIONS_BY_FACULTY: Record<string, string[]>`
Mapping faculté → liste de filières/programmes. Exemples :

| Faculté | Filières |
|---------|----------|
| Faculté des sciences | Mathématiques, Sciences informatiques, Physique, Chimie et Biochimie, Biologie, Sciences de la Terre, Sciences pharmaceutiques |
| GSEM | Management, Économie, Finance, Statistique, Data Science |
| Droit | Droit suisse, Droit international et européen, Droit économique |

### `DEGREE_LEVELS: string[]`
```js
['BACHELOR', 'MASTER', 'PHD']
```

### `DEGREE_LABELS: Record<string, string>`
```js
{ BACHELOR: 'Bachelor', MASTER: 'Master', PHD: 'Doctorat (PhD)' }
```

**Utilisé par :** `useEventForm.js` (calcul de `availableMajors`), `EventFormShared.jsx` (sélecteurs de restriction), `EventDetailPage.jsx` (affichage des restrictions).

---

## Relations entre fichiers

```
AppContext.jsx
  ├── setApiTokenGetter()  ──────────────────→  lib/apiClient.js  (singleton hors-React)
  ├── setupAuth0Interceptor()  ──────────────→  lib/api.js        (intercepteur apiAuthClient)
  └── demoMode.js (DEMO_MODE, DEMO_USER, DEMO_ROLE)

hooks/useApi.js
  └── lib/api.js (apiAuthClient)

lib/apiServices.js
  ├── lib/api.js (apiGet, apiPost, apiPut, apiPatch, apiDelete, apiClient)
  └── exposé dans les pages et hooks via import direct

lib/cloudinaryAvatar.js  ┐
lib/cloudinaryBanner.js  ┘  → lib/apiClient.js (pour l'endpoint de signature)

lib/profileUtils.js
  ├── lib/apiClient.js
  └── lib/demoMode.js (DEMO_MODE)

hooks/useEventForm.js
  └── lib/universityData.js (PROGRAM_OPTIONS_BY_FACULTY)

components/layout/navItems.js
  └── lucide-react (icônes uniquement)

lib/sampleEvents.js   → standalone (aucune dépendance interne)
lib/categories.js     → standalone
lib/demoMode.js       → standalone
lib/universityData.js → standalone
setupTests.js         → Vitest uniquement (ne fait pas partie du bundle prod)
```
