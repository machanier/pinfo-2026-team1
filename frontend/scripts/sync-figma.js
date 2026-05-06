// frontend/scripts/sync-figma.js
import fs from 'fs'
import axios from 'axios'
import dotenv from 'dotenv'

// Charge les variables d'environnement
dotenv.config({ path: '.env.local' })

const FIGMA_TOKEN = process.env.FIGMA_API_TOKEN
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID

if (!FIGMA_TOKEN || !FIGMA_FILE_ID) {
  console.error('❌ Erreur : FIGMA_API_TOKEN ou FIGMA_FILE_ID manquant dans .env.local')
  process.exit(1)
}

// Fonction pour convertir une couleur Figma (0-1) en Hexadécimal (#RRGGBB)
const rgbaToHex = (r, g, b) => {
  const toHex = (value) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function syncFigma() {
  console.log('🔄 Connexion à Figma en cours...')

  try {
    // 1. Appel à l'API Figma
    const response = await axios.get(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}`, {
      headers: { 'X-Figma-Token': FIGMA_TOKEN },
    })

    const document = response.data.document
    const colors = {}

    console.log('✅ Données récupérées. Extraction des couleurs...')

    // 2. Recherche basique des couleurs dans le document
    // Note : Cette logique cherche les nœuds appelés "Rectangle" avec un "fill".
    // Dans un vrai projet, on cible souvent une page "Design System" spécifique.
    const extractColors = (node) => {
      if (
        node.type === 'RECTANGLE' &&
        node.fills &&
        node.fills[0] &&
        node.fills[0].type === 'SOLID'
      ) {
        const color = node.fills[0].color
        // On utilise le nom du nœud comme nom de variable (ex: "primary-blue")
        const name = node.name.toLowerCase().replace(/\s+/g, '-')
        colors[name] = rgbaToHex(color.r, color.g, color.b)
      }

      if (node.children) {
        node.children.forEach(extractColors)
      }
    }

    extractColors(document)

    // 3. Sauvegarde dans un fichier JSON pour Tailwind
    const outputPath = './src/styles/figma-tokens.json'
    fs.writeFileSync(outputPath, JSON.stringify(colors, null, 2))

    console.log(
      `🎉 Succès ! ${Object.keys(colors).length} couleurs ont été sauvegardées dans ${outputPath}`,
    )
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation Figma :', error.message)
  }
}

syncFigma()
