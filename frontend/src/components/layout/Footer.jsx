import { Link } from 'react-router-dom'

const REPO_URL = 'https://github.com/machanier/pinfo-2026-team1'

// Réseaux officiels de l'UNIGE (vérifiés sur unige.ch) + dépôt GitHub de l'équipe.
const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/unigeneve/',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/unigeneve',
    path: 'M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/university-of-geneva',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'X',
    href: 'https://twitter.com/UNIGEnews',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCLVD78-qZV06ULrJ6eKJIiQ',
    path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'GitHub',
    href: REPO_URL,
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
]

const RESOURCES = [
  ['À propos', '/a-propos'],
  ['Aide & FAQ', '/aide'],
  ['Contact', '/contact'],
  ['Confidentialité', '/confidentialite'],
]

function FooterLink({ label, href }) {
  const cls = 'text-sm text-gray-600 transition hover:text-pink-600'
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={cls}>
        {label}
      </Link>
    )
  }
  const external = href.startsWith('http')
  return (
    <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {label}
    </a>
  )
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <FooterLink label={label} href={href} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Marque + réseaux */}
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="UNIGEvents logo"
                width="24"
                height="24"
                className="h-6 w-6 object-contain"
              />
              <span className="text-lg font-bold text-gray-900">UNIGEvents</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              Les événements de l’Université de Genève, réunis en un seul endroit.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-pink-50 hover:text-pink-600"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Colonnes de liens */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-16">
            <FooterCol
              title="Explorer"
              links={[
                ['Accueil', '/'],
                ['Recherche', '/search'],
                ['Calendrier', '/calendar'],
              ]}
            />
            <FooterCol
              title="Mon espace"
              links={[
                ['Profil', '/profile'],
                ['Mes inscriptions', '/my-events'],
                ['Notifications', '/notifications'],
              ]}
            />
            <FooterCol title="Ressources" links={RESOURCES} />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row sm:justify-between">
          <p>© {year} UNIGEvents · Université de Genève</p>
          <a
            href="https://www.unige.ch"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-pink-600"
          >
            unige.ch
          </a>
        </div>
      </div>
    </footer>
  )
}
