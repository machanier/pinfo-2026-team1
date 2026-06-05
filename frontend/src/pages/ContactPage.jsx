import { Mail, MapPin } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
      <p className="mt-1 text-gray-500">Une question, une suggestion, un souci ? Écris-nous.</p>

      <div className="mt-6 space-y-3">
        <a
          href="mailto:contact@unigevents.ch"
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-pink-200 hover:shadow-md"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Email</p>
            <p className="text-sm text-gray-600">contact@unigevents.ch</p>
          </div>
        </a>
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-gray-900">Université de Genève</p>
            <p className="text-sm text-gray-600">24 rue du Général-Dufour, 1211 Genève 4</p>
          </div>
        </div>
      </div>
    </div>
  )
}
