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

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `build` | `npm run build` | Build for production |
| `lint` | `npm run lint` | Run ESLint |
| `preview` | `npm run preview` | Preview production build |
