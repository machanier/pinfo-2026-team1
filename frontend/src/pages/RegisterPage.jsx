import { useState } from 'react'
import Button from '../components/ui/button'

export default function RegisterPage() {
  const [accountType, setAccountType] = useState('STUDENT')

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Inscription</h1>
      <p className="mt-1 text-sm text-gray-600">Création de compte étudiant ou organisateur.</p>

      <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="accountType" className="mb-1 block text-sm font-medium text-gray-700">
            Type de compte
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setAccountType('STUDENT')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                accountType === 'STUDENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setAccountType('ORGANIZER')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                accountType === 'ORGANIZER' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Organizer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Ex: Alice Martin"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="alice@etu.univ.fr"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Confirmation
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        {accountType === 'STUDENT' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="program" className="mb-1 block text-sm font-medium text-gray-700">
                Filière
              </label>
              <input
                id="program"
                type="text"
                placeholder="Informatique"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="year" className="mb-1 block text-sm font-medium text-gray-700">
                Année
              </label>
              <select
                id="year"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
              >
                <option>L1</option>
                <option>L2</option>
                <option>L3</option>
                <option>M1</option>
                <option>M2</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="organizationName"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Nom de l'organisation
              </label>
              <input
                id="organizationName"
                type="text"
                placeholder="BDE Informatique"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="organizationType"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Type d'organisation
              </label>
              <input
                id="organizationType"
                type="text"
                placeholder="Association étudiante"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" className="bg-pink-600 hover:opacity-95">
            Créer mon compte
          </Button>
        </div>
      </form>
    </section>
  )
}
