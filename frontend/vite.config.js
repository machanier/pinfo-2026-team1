import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true, // Permet d'éviter d'importer describe/it partout
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // --- AJOUT DE LA SECTION COVERAGE ---
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'], // 'lcov' génère le fichier pour SonarCloud
      include: ['src/**/*.{js,jsx}'],
      exclude: ['node_modules/', 'src/main.jsx', 'src/setupTests.js', '**/*.test.jsx'],
    },
  },
})
