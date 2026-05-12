# Frontend

This folder contains the frontend application of the **UNIGEvents** project.

The frontend is a Single Page Application (SPA) built with **React** and bundled by **Vite**.

---

## Tech Stack

- Language: JavaScript (ES Modules)
- Framework: React 19
- Bundler: Vite 7
- Linter: ESLint
- Formatter: Prettier

---

## Structure

```
src/
├── App.jsx        ← main application component
├── App.css        ← application styles
├── main.jsx       ← React entry point
└── index.css      ← global styles
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

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server with HMR, secrets injected via Doppler |
| `dev:nosecrets` | `npm run dev:nosecrets` | Start Vite without Doppler (fallback / offline) |
| `build` | `npm run build` | Build for production |
| `lint` | `npm run lint` | Run ESLint |
| `preview` | `npm run preview` | Preview production build |
