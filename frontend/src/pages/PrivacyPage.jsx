export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900">Confidentialité</h1>
      <div className="mt-4 space-y-4 text-gray-600">
        <p>
          UNIGEvents ne collecte que les données nécessaires à son fonctionnement : ton profil
          (nom, e-mail, faculté) et tes inscriptions aux événements.
        </p>
        <p>
          Tes données ne sont jamais revendues. Elles servent uniquement à gérer ton compte et tes
          inscriptions aux événements.
        </p>
        <p>
          Tu peux à tout moment consulter et modifier tes informations depuis ton profil, ou
          demander leur suppression en nous contactant.
        </p>
        <p className="text-sm text-gray-400">
          Cette page est un exemple réalisé dans le cadre d&apos;un projet étudiant et ne constitue
          pas une politique de confidentialité officielle.
        </p>
      </div>
    </div>
  )
}
