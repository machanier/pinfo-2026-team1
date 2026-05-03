// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pink-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-pink text-pink-200">404</h1>

        <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl mt-4">
          Oups ! Page introuvable.
        </p>

        <p className="mt-4 text-gray-500">
          Il semble que vous vous soyez perdu. La page que vous cherchez n'existe pas.
        </p>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-block rounded-md bg-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 transition-colors"
          >
            Retourner à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
