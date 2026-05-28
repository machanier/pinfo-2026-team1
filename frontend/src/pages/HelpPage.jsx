const FAQ = [
  {
    q: "Comment m'inscrire à un événement ?",
    a: "Connecte-toi avec ton compte, ouvre l'événement qui t'intéresse et clique sur « S'inscrire ».",
  },
  {
    q: 'Dois-je avoir un compte pour parcourir les événements ?',
    a: "Non : tu peux explorer l'accueil, la recherche et les fiches d'événements sans compte. La connexion n'est requise que pour t'inscrire ou gérer tes inscriptions.",
  },
  {
    q: 'Comment retrouver mes inscriptions ?',
    a: 'Une fois connecté·e, ouvre « Mes inscriptions » depuis le menu.',
  },
  {
    q: 'Je représente une association, comment publier un événement ?',
    a: "Les comptes organisateurs disposent d'un bouton « Nouvel événement ». Contacte-nous pour obtenir un accès organisateur.",
  },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900">Aide &amp; FAQ</h1>
      <p className="mt-1 text-gray-500">Les réponses aux questions les plus fréquentes.</p>
      <dl className="mt-6 space-y-3">
        {FAQ.map((item) => (
          <div key={item.q} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <dt className="font-semibold text-gray-900">{item.q}</dt>
            <dd className="mt-1 text-sm text-gray-600">{item.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
