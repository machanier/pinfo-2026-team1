# Tests UI / E2E — Karate

Module **autonome** (son propre `pom.xml`, hors du build `backend/`) qui rejoue le
parcours d'un vrai utilisateur dans un **navigateur** pour vérifier que le site
fonctionne de bout en bout :

| Feature | Ce qu'elle fait | Modifie des données ? |
|---|---|---|
| [`ui/browser-login.feature`](ui/browser-login.feature) | Login STUDENT / ORGANIZER / ADMIN, vérifie la navbar | Non (lecture seule) |
| [`ui/event-creation.feature`](ui/event-creation.feature) | Login orga → crée **et publie** un événement, vérifie l'affichage | **Oui** : crée un événement (bloqué en prod, cf. plus bas) |

> ℹ️ **Karate** = l'outil de test (pas **Kafka**, le broker du projet). Rien ici
> ne touche Kafka ni la prod.

---

## Le modèle de comptes (important)

Karate est comme un **cascadeur** : il sait conduire le site, mais pour jouer la
scène « connexion » il faut lui prêter **les clés d'un vrai compte**. Il n'y a
donc **pas d'identifiant « Karate »** — il te faut **les comptes de test Auth0**
(email + mot de passe) qu'il va taper dans la page de login :

- un compte **STUDENT**, un **ORGANIZER**, un **ADMIN** (selon ce que tu lances).
- Ces comptes doivent exister dans le tenant Auth0 avec le bon rôle.

Les **emails** se mettent dans [`dev.json`](dev.json) (ou `prod.json`).
Les **mots de passe** se fournissent de deux façons :

### Option A — Doppler en clair (recommandé)

Tu as déjà Doppler : mets-y simplement les mots de passe **en clair**, pas besoin
de chiffrer quoi que ce soit.

| Variable Doppler / env | Rôle |
|---|---|
| `TEST_ORGANIZER_PASSWORD` | mot de passe du compte orga |
| `TEST_STUDENT_PASSWORD` | mot de passe du compte étudiant |
| `TEST_ADMIN_PASSWORD` | mot de passe du compte admin |
| `AUTH0_CLIENT_ID` | *(optionnel, seulement pour le flow token API)* |

Puis on lance avec `doppler run -- …` (voir plus bas). La config prend ces
variables en priorité.

### Option B — chiffré dans le JSON (sans Doppler)

Sans coffre, on évite d'écrire les mots de passe en clair dans le repo : on les
chiffre (AES) une fois, et on colle le résultat dans `dev.json`.

```bash
cd test
# édite d'abord util/encrypt-credentials.feature: mets le vrai email + mot de passe
mvn test -Dkarate.options="classpath:util/encrypt-credentials.feature"
# copie chaque "ENC >>> ..." dans le champ *PasswordEnc correspondant de dev.json
```

> ⚠️ Ce chiffrement est **faible** (la clé de déchiffrement est l'email, stocké
> juste à côté). Ne committe **jamais** un `dev.json` rempli de vraies valeurs :
> édite-le en local sans le `git add`, ou utilise l'option A.

---

## Prérequis

- **Java 21** + **Maven**
- **La stack qui tourne** et que les tests visent :
  - dev (défaut) : `docker compose --profile fullstack up -d` → `http://localhost:8000`
- **Un navigateur** (tu es sur Mac) :
  - **Chrome** (le plus simple) : `-DbrowserType=chrome`
  - **Safari** : `-DbrowserType=safaridriver`, après avoir activé l'automation :
    `sudo safaridriver --enable` (ou Safari → menu *Développement* → *Autoriser
    l'automatisation à distance*). Safari ne fait **pas** de headless → la fenêtre
    s'ouvre toujours (la config force `headless=false` pour Safari).
  - **Firefox** (défaut) : nécessite geckodriver → `brew install geckodriver`

---

## Lancer les tests

```bash
cd test

# Tout, en local dev, navigateur Chrome visible :
mvn test -Dkarate.env=dev -DbrowserType=chrome -Dheadless=false

# Avec les secrets Doppler :
doppler run -- mvn test -Dkarate.env=dev -DbrowserType=chrome -Dheadless=false

# Safari (Mac) :
mvn test -Dkarate.env=dev -DbrowserType=safaridriver

# Un seul scénario :
mvn test -Dkarate.options="classpath:ui/browser-login.feature"

# Viser le serveur Vite plutôt que Kong :
mvn test -DappUrl=http://localhost:5173
```

**Rapport** généré après coup (fichier HTML local, ne modifie rien) :
`test/target/karate-reports/karate-summary.html`.

---

## Sécurité / ce que ça touche

| Action | Touche quoi |
|---|---|
| Merger ce module | **Rien** (code inerte, hors CI et hors build backend) |
| Générer / ouvrir le rapport | **Rien** (fichier HTML local) |
| `browser-login` | **Rien** côté données (lecture seule) |
| `event-creation` en **dev local** | crée un événement dans **ta** base locale (jetable) |
| `event-creation` en **prod** | **bloqué** : `karate.abort()` si `-Dkarate.env=prod` |

Autrement dit : lancé en **dev local** (le défaut), rien n'est touché côté
prod/cluster — seulement ta machine.

---

## Environnements

| `-Dkarate.env=` | `appUrl` par défaut |
|---|---|
| `dev` (défaut) | `http://localhost:8000` (`baseUrl` du `dev.json`) |
| `prod` | `https://pinfo1.p-info.net` (override possible via `PROD_BASE_URL`) |
