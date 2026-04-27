# Frontend Summary - UNIGEvents

## 1. Scope of this summary

This document summarizes the current state of the `frontend/` folder:

- app architecture
- routing and route guards
- UI/layout/components
- pages and features
- tests
- build/runtime/deployment config
- file inventory

Note: `node_modules/` and `dist/` exist in the folder but are generated artifacts (dependencies/build output), so they are not described file-by-file.

## 2. Tech stack

- React 19 (SPA)
- React Router DOM 7
- Vite 7
- Tailwind CSS (via `@tailwindcss/postcss`)
- ESLint 9 + Prettier
- Vitest + Testing Library + jsdom
- Lucide React icons

## 3. Runtime entry and app bootstrap

- `src/main.jsx`
  - mounts React app with `createRoot`
  - wraps app with `BrowserRouter`
  - imports global styles from `src/index.css`

- `src/App.jsx`
  - wraps routing with `AppProvider`
  - declares all app routes
  - applies auth and role guards

## 4. Routing map

### Public-only routes

- `/login`
- `/register`

These routes are wrapped by `PublicOnlyRoute`.

### Authenticated routes (inside main layout)

- `/`
- `/profile`
- `/my-events`
- `/events/:id`
- `/organizers/:id`
- `/notifications`

These routes are wrapped by `RequireAuthRoute` and rendered inside `MainLayout`.

### Role-protected routes (ORGANIZER)

- `/events/create`
- `/events/edit/:id`

These routes are wrapped by `RequireRoleRoute` with `allowedRoles=['ORGANIZER']`.

### Fallback route

- `*` -> "Page introuvable"

## 5. Route guards behavior

File: `src/routes/AuthRouteWrappers.jsx`

- `PublicOnlyRoute`
  - redirects only when `isAuthenticated === true`
  - otherwise renders children

- `RequireAuthRoute`
  - redirects when `isAuthenticated !== true`
  - this means `false` and `undefined` are both denied

- `RequireRoleRoute`
  - redirects when `userRole` is not in `allowedRoles`

## 6. App state and context

### Context definition

- `src/contexts/AppContextValue.jsx`
  - creates `AppContext`

### Context provider

- `src/contexts/AppContext.jsx`
  - state:
    - `isAuthenticated` (default: `true`)
    - `userRole` (default: `STUDENT`)
    - `displayName` (default: `Student Test`)
    - `savedEvents` (default: `[]`)
  - exposes state + setters via provider

### Hook

- `src/contexts/useApp.jsx`
  - custom hook to consume context
  - throws error if used outside provider

## 7. Layout and navigation components

### Main layout

- `src/layouts/MainLayout.jsx`
  - top navbar
  - responsive sidebar
  - mobile overlay to close sidebar
  - `Outlet` for nested route content

### Navbar

- `src/components/layout/Navbar.jsx`
  - branding + links
  - search input (desktop + mobile)
  - notifications/profile links
  - shows first name from `displayName`

### Sidebar

- `src/components/layout/Sidebar.jsx`
  - menu varies by role (`STUDENT` vs `ORGANIZER`)
  - active link styling
  - mobile toggle support via `isOpen`/`onNavigate`

### Shared UI atoms

- `src/components/ui/button.jsx`
  - reusable button with variants (`default`, `ghost`)
- `src/components/ui/badge.jsx`
  - reusable badge/chip element

## 8. Pages implemented

- `src/pages/RegisterPage.jsx`
  - registration form
  - toggles fields by account type (`STUDENT`/`ORGANIZER`)

- `src/pages/EventCreatePage.jsx`
  - organizer-only create-event form UI

- `src/pages/EventEditPage.jsx`
  - organizer-only edit-event form UI (by event id)

- `src/pages/EventDetailPage.jsx`
  - event detail view using route param id

- `src/pages/OrganizerProfilePage.jsx`
  - organizer profile with list of published events and links

- `src/pages/NotificationsPage.jsx`
  - static notification feed (mocked list)

## 9. Testing

### Test setup

- `src/setupTests.js`
  - jest-dom matchers
  - auto-cleanup after each test

### Route/security tests

- `src/routes/AuthRouteWrappers.test.jsx`
  - validates redirects/rendering for:
    - authenticated users
    - unauthenticated users
    - undefined auth state
    - role allowed/denied

- `src/App.test.jsx`
  - checks routing security scenarios in app-level integration

### UI/layout/pages tests

- `src/layouts/MainLayout.test.jsx`
  - verifies mobile sidebar open/close behavior

- `src/pages/pages.test.jsx`
  - verifies main page render paths and interactions

## 10. Styling and frontend tooling

- `src/index.css`
  - imports Tailwind CSS
  - resets body margin/padding

- `tailwind.config.js`
  - content scan paths for Tailwind

- `postcss.config.js`
  - plugins: `@tailwindcss/postcss`, `autoprefixer`

- `.prettierrc`
  - formatting conventions (single quotes, trailing commas, no semicolons)

- `eslint.config.js`
  - JS + React hooks + React refresh rules
  - ignores `dist`

## 11. Build, dev, and test config

- `package.json`
  - scripts:
    - `npm run dev`
    - `npm run build`
    - `npm run lint`
    - `npm run preview`
    - `npm run test`
    - `npm run test:watch`

- `vite.config.js`
  - React plugin
  - dev server on `0.0.0.0:5173` (strict port)
  - Vitest config + v8 coverage (`text`, `lcov`)

- `index.html`
  - app shell mounting to `<div id="root"></div>`

## 12. Environment variables

- `.env`
  - `VITE_PROFILE_MOCK=false`
  - `VITE_API_BASE_URL=http://localhost:8000`

- `.env.local`
  - `VITE_PROFILE_MOCK=true`
  - `VITE_API_BASE_URL=http://localhost:8000`

## 13. Container and deployment files

- `Dockerfile`
  - multi-stage build (Node build -> Nginx serve)
  - serves production bundle from `/usr/share/nginx/html`

- `nginx.conf`
  - SPA fallback to `index.html`
  - long cache headers for static assets

## 14. Frontend file inventory (current)

### Root files

- `.env`
- `.env.local`
- `.gitignore`
- `.prettierrc`
- `Dockerfile`
- `README.md`
- `eslint.config.js`
- `index.html`
- `nginx.conf`
- `package.json`
- `package-lock.json`
- `postcss.config.js`
- `tailwind.config.js`
- `vite.config.js`

### Public assets

- `public/vite.svg`

### Source files

- `src/main.jsx`
- `src/App.jsx`
- `src/App.test.jsx`
- `src/index.css`
- `src/setupTests.js`
- `src/contexts/AppContext.jsx`
- `src/contexts/AppContextValue.jsx`
- `src/contexts/useApp.jsx`
- `src/routes/AuthRouteWrappers.jsx`
- `src/routes/AuthRouteWrappers.test.jsx`
- `src/layouts/MainLayout.jsx`
- `src/layouts/MainLayout.test.jsx`
- `src/components/layout/Navbar.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/ui/button.jsx`
- `src/components/ui/badge.jsx`
- `src/pages/EventCreatePage.jsx`
- `src/pages/EventDetailPage.jsx`
- `src/pages/EventEditPage.jsx`
- `src/pages/NotificationsPage.jsx`
- `src/pages/OrganizerProfilePage.jsx`
- `src/pages/RegisterPage.jsx`
- `src/pages/pages.test.jsx`

## 15. Current maturity snapshot

- Route guards are implemented and tested.
- Routing is complete for current pages.
- Some routes still render placeholders in `App.jsx` (`/login`, `/profile`, `/my-events`) instead of dedicated page components.
- Frontend pipeline exists and runs through lint, tests, and build.
