import { useState } from 'react'
import Button from '../components/ui/button'

function isValidEmail(email) {
  // Simple, ReDoS-safe email validation
  // Checks for basic email format without complex backtracking
  if (!email || email.length > 254) return false
  const parts = email.split('@')
  if (parts.length !== 2) return false
  const [localPart, domain] = parts
  if (!localPart || localPart.length > 64) return false
  if (!domain || !domain.includes('.')) return false
  return true
}

export default function RegisterPage() {
  const [accountType, setAccountType] = useState('STUDENT')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    program: '',
    year: 'L1',
    organizationName: '',
    organizationType: '',
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  function validateForm() {
    const newErrors = {}
    if (!formData.fullName?.trim()) newErrors.fullName = 'Le nom complet est requis'
    if (!formData.email?.trim()) newErrors.email = "L'email est requis"
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Email invalide'
    }
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    if (accountType === 'STUDENT') {
      if (!formData.program?.trim()) newErrors.program = 'La filière est requise'
    } else {
      if (!formData.organizationName?.trim())
        newErrors.organizationName = "Le nom de l'organisation est requis"
      if (!formData.organizationType?.trim())
        newErrors.organizationType = "Le type d'organisation est requis"
    }

    return newErrors
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const newErrors = validateForm()

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSuccessMessage('Compte créé avec succès! Redirection vers la connexion...')
    setTimeout(() => {
      // In real app, redirect to login or auto-authenticate
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        program: '',
        year: 'L1',
        organizationName: '',
        organizationType: '',
      })
      setSuccessMessage('')
    }, 2000)
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Inscription</h1>
      <p className="mt-1 text-sm text-gray-600">Création de compte étudiant ou organisateur.</p>

      {successMessage && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="accountType" className="mb-1 block text-sm font-medium text-gray-700">
            Type de compte
          </label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAccountType('STUDENT')
                setErrors({})
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                accountType === 'STUDENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountType('ORGANIZER')
                setErrors({})
              }}
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
              Nom complet *
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Ex: Alice Martin"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.fullName
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="alice@etu.univ.fr"
              value={formData.email}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Mot de passe *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Confirmation *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                errors.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-pink-500'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {accountType === 'STUDENT' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="program" className="mb-1 block text-sm font-medium text-gray-700">
                Filière *
              </label>
              <input
                id="program"
                name="program"
                type="text"
                placeholder="Informatique"
                value={formData.program}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                  errors.program
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-pink-500'
                }`}
              />
              {errors.program && <p className="mt-1 text-xs text-red-600">{errors.program}</p>}
            </div>
            <div>
              <label htmlFor="year" className="mb-1 block text-sm font-medium text-gray-700">
                Année
              </label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
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
                Nom de l'organisation *
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="BDE Informatique"
                value={formData.organizationName}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                  errors.organizationName
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-pink-500'
                }`}
              />
              {errors.organizationName && (
                <p className="mt-1 text-xs text-red-600">{errors.organizationName}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="organizationType"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Type d'organisation *
              </label>
              <input
                id="organizationType"
                name="organizationType"
                type="text"
                placeholder="Association étudiante"
                value={formData.organizationType}
                onChange={handleChange}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
                  errors.organizationType
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-pink-500'
                }`}
              />
              {errors.organizationType && (
                <p className="mt-1 text-xs text-red-600">{errors.organizationType}</p>
              )}
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
