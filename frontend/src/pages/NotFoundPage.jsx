// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#ffe4f0,_#fff0f7_40%,_#f7f7ff_70%)] px-6 py-16">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-[#ff9ac2] blur-3xl" />
        <div className="absolute right-8 top-20 h-56 w-56 rounded-full bg-[#f6b4ff] blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-[#ffc1dc] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <p
            className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e64e9a]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Lost in UniEvents
          </p>
          <h1
            className="mt-4 text-4xl font-semibold text-[#1b1f2a] sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Oups. Cette page n'a pas l'air d'exister.
          </h1>
          <p className="mt-4 text-base text-slate-600" style={{ fontFamily: 'var(--font-body)' }}>
            On dirait que le lien est cassé ou que la page a été déplacée.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/"
              className="rounded-full bg-[#e64e9a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/70 transition hover:-translate-y-0.5 hover:bg-[#d73f8b]"
            >
              Retour à l'accueil
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#e64e9a]" />
            <span style={{ fontFamily: 'var(--font-body)' }}>
              Error code 404 - Itinéraire introuvable
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
