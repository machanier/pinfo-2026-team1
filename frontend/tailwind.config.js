/** @type {import('tailwindcss').Config} */
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

let figmaTokens = {}
try {
  figmaTokens = require('./src/styles/figma-tokens.json')
} catch (error) {
  if (error?.code !== 'MODULE_NOT_FOUND') {
    throw error
  }
  // fichier non encore généré — lancer `npm run sync-figma` pour le créer
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Couleurs synchronisées depuis Figma (npm run sync-figma)
        ...figmaTokens,
      },
    },
  },
  plugins: [],
}
