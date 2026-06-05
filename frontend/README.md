# Frontend

This folder contains the frontend application of the **UNIGEvents** project.

The frontend is a Single Page Application (SPA) built with **React** and bundled by **Vite**.

---

## Tech Stack

| Category      | Technology                   |
| ------------- | ---------------------------- |
| Language      | JavaScript (ES Modules)      |
| Framework     | React 19                     |
| Bundler       | Vite 7                       |
| Routing       | React Router v7              |
| Data fetching | TanStack Query v5            |
| HTTP client   | Axios                        |
| Auth          | Auth0 (`@auth0/auth0-react`) |
| Styling       | Tailwind CSS v4              |
| Icons         | Lucide React                 |
| Linter        | ESLint                       |
| Tests         | Vitest + Testing Library     |

---

## Structure

```
src/
├── App.jsx                          ← root component & route definitions
├── main.jsx                         ← React entry point (providers + BrowserRouter)
├── index.css                        ← global styles (Tailwind)
├── auth/
│   ├── Auth0ProviderWithConfig.jsx  ← Auth0 provider wrapper
│   └── apiClient.js                 ← useApiClient() — authenticated Axios hook
├── components/
│   ├── ErrorBoundary.jsx            ← top-level error boundary
│   ├── event/
│   │   ├── EventCard.jsx            ← event card used in listings
│   │   ├── EventFormShared.jsx      ← shared create/edit event form
│   │   ├── BannerUpload.jsx         ← event banner upload widget
│   │   └── FavoriteButton.jsx       ← add/remove favourite toggle
│   ├── layout/
│   │   ├── Navbar.jsx               ← top navigation bar
│   │   ├── Sidebar.jsx              ← side navigation drawer
│   │   ├── Footer.jsx               ← page footer
│   │   └── navItems.js              ← navigation link definitions
│   ├── moderation/
│   │   └── OrganizerName.jsx        ← resolves an organiser id to a name
│   └── ui/
│       ├── badge.jsx                ← Badge primitive
│       └── button.jsx               ← Button primitive
├── contexts/
│   ├── AppContext.jsx               ← global app state context
│   ├── AppContextValue.jsx          ← context value factory
│   └── useApp.jsx                   ← useApp() consumer hook
├── hooks/
│   ├── useApi.js                    ← generic API request hook
│   ├── useEventForm.js              ← event form state & validation hook
│   ├── useDebounce.js               ← debounce helper (search input)
│   ├── useNotifications.js          ← notifications data hook
│   └── useUnsavedChangesGuard.js    ← warn before leaving a dirty form
├── layouts/
│   └── MainLayout.jsx               ← authenticated shell (Navbar + Sidebar)
├── lib/
│   ├── api.js                       ← low-level fetch helpers
│   ├── apiClient.js                 ← configured Axios client
│   ├── apiServices.js               ← per-resource service methods
│   ├── categories.js                ← event category definitions
│   ├── cloudinaryAvatar.js          ← avatar signed-upload helpers
│   ├── cloudinaryBanner.js          ← banner signed-upload helpers
│   ├── demoMode.js                  ← demo-mode flag & helpers
│   ├── profileUtils.js              ← profile data utilities
│   ├── sampleEvents.js              ← sample/seed event data
│   └── universityData.js            ← static university list
├── pages/
│   ├── HomePage.jsx                 ← landing page
│   ├── EventsPage.jsx               ← event listing / discovery
│   ├── EventDetailPage.jsx          ← single event details
│   ├── EventCreatePage.jsx          ← create new event
│   ├── EventEditPage.jsx            ← edit existing event
│   ├── MyEventsPage.jsx             ← organiser's own events
│   ├── SearchPage.jsx               ← search results
│   ├── FavoritesPage.jsx            ← "Mes favoris" list
│   ├── CalendarPage.jsx             ← personal event calendar
│   ├── ProfilePage.jsx              ← view user profile
│   ├── EditProfilePage.jsx          ← edit user profile
│   ├── OrganizerProfilePage.jsx     ← public organiser profile
│   ├── NotificationsPage.jsx        ← in-app notifications
│   ├── NotificationPreferencesPage.jsx ← notification preferences
│   ├── AdminModerationPage.jsx      ← moderation queue (admin)
│   ├── AdminModerationDetailPage.jsx ← moderation case detail (admin)
│   ├── AboutPage.jsx                ← about page
│   ├── ContactPage.jsx              ← contact page
│   ├── HelpPage.jsx                 ← help / FAQ page
│   ├── PrivacyPage.jsx              ← privacy policy
│   ├── LoginPage.jsx                ← login / redirect to Auth0
│   └── NotFoundPage.jsx             ← 404 fallback
├── routes/
│   └── AuthRouteWrappers.jsx        ← protected & public route guards
└── styles/
    └── figma-tokens.json           ← Figma design tokens (stub)
```

---

## Getting Started

Refer to the [Installation Guide](../docs/INSTALL.md) to install Node.js.

```bash
# Install dependencies
cd frontend
npm install

# Start development server (hot reload)
npm run dev
```

The app is available at `http://localhost:5173`.

> `npm run dev` reads secrets from Doppler. Set up Doppler once (see below) before running it — or use `npm run dev:nosecrets` to start Vite without injecting any secret.

---

## Secrets management (Doppler)

Secrets (Auth0, Cloudinary, OpenAI, …) are stored in [Doppler](https://doppler.com), not in a local `.env`. `npm run dev` wraps Vite with `doppler run --`, which fetches the secrets from the cloud and injects them as env vars at startup.

### One-time setup (per developer)

```bash
# 1. Install the CLI
brew install dopplerhq/cli/doppler

# 2. Log in (opens the browser)
doppler login

# 3. From the repo root, link this checkout to the project/config
#    declared in doppler.yaml at the root (project: unigevents, config: dev)
doppler setup
```

After this, `npm run dev` picks the right secrets automatically.

### Adding a new secret

1. Open the Doppler dashboard → project `unigevents` → config `dev`
2. Add the variable (use the `VITE_` prefix if it must be exposed to the browser bundle)
3. Restart `npm run dev` — Doppler refetches on each start

---

## Available Scripts

| Script          | Command                 | Description                                                  |
| --------------- | ----------------------- | ------------------------------------------------------------ |
| `dev`           | `npm run dev`           | Start Vite dev server with HMR, secrets injected via Doppler |
| `dev:nosecrets` | `npm run dev:nosecrets` | Start Vite without Doppler (fallback / offline)              |
| `build`         | `npm run build`         | Build for production                                         |
| `lint`          | `npm run lint`          | Run ESLint                                                   |
| `preview`       | `npm run preview`       | Preview production build                                     |
| `test`          | `npm run test`          | Run unit tests once (Vitest)                                 |
| `test:watch`    | `npm run test:watch`    | Run tests in watch mode                                      |
| `sync-figma`    | `npm run sync-figma`    | Sync design tokens from Figma                                |
