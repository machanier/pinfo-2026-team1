// GUIDE D'IMPLÉMENTATION: Cycle de vie de la session utilisateur
// Résout les 4 tickets Jira: PINFO-20, PINFO-18, PINFO-17, PINFO-19

/**
 * ============================================================================
 * PINFO-20: PERSISTANCE DE SESSION
 * ============================================================================
 *
 * Après un login réussi, la session persiste même si l'utilisateur
 * rafraîchit la page.
 *
 * IMPLÉMENTATION:
 * - AppContext.jsx utilise localStorage pour sauvegarder le token JWT
 *   et les données utilisateur
 * - Un useEffect au montage du AppProvider restaure l'état depuis
 *   localStorage si un token valide existe
 * - Les clés utilisées:
 *   - authToken: le JWT token
 *   - userData: objet { id, role, displayName, email }
 *
 * FICHIERS AFFECTÉS:
 * - src/contexts/AppContext.jsx (restauration au montage + login)
 *
 * EXEMPLE D'UTILISATION:
 * L'utilisateur login, le AppProvider sauvegarde dans localStorage.
 * Si l'utilisateur rafraîchit la page, le useEffect restaure la session
 * automatiquement et l'utilisateur reste connecté.
 */

/**
 * ============================================================================
 * PINFO-18: REDIRECTION POST-LOGIN
 * ============================================================================
 *
 * Après une connexion réussie, l'utilisateur est automatiquement redirigé
 * vers son profil ou le dashboard.
 *
 * IMPLÉMENTATION:
 * - La fonction login() dans AppContext.jsx appelle navigate('/profile')
 * - Cela utilise le hook useNavigate() de react-router-dom
 * - La redirection est automatique après un login réussi
 *
 * FICHIERS AFFECTÉS:
 * - src/contexts/AppContext.jsx (fonction login avec navigate)
 * - src/pages/LoginPage.jsx (appelle login après authentification)
 *
 * EXEMPLE:
 * Dans LoginPage.jsx, après recevoir le token du backend:
 *   login(userData, token)
 *   // AppContext redirige automatiquement vers /profile
 */

/**
 * ============================================================================
 * PINFO-17: LOGOUT
 * ============================================================================
 *
 * L'utilisateur peut se déconnecter via une fonction globale.
 *
 * IMPLÉMENTATION:
 * - La fonction logout() est fournie par AppContext
 * - Elle est accessible depuis n'importe quel composant via useApp()
 * - Elle efface le localStorage et réinitialise l'état
 *
 * FICHIERS AFFECTÉS:
 * - src/contexts/AppContext.jsx (fonction logout)
 * - src/components/layout/Navbar.jsx (bouton logout dans le menu)
 *
 * EXEMPLE D'UTILISATION DANS UN COMPOSANT:
 *
 * import { useApp } from '../contexts/useApp'
 *
 * export function MonComposant() {
 *   const { logout } = useApp()
 *
 *   return (
 *     <button onClick={logout}>
 *       Déconnexion
 *     </button>
 *   )
 * }
 */

/**
 * ============================================================================
 * PINFO-19: INVALIDATION DE SESSION
 * ============================================================================
 *
 * Lors de la déconnexion, les données de session sont totalement purgées
 * et l'utilisateur est redirigé vers la page de login.
 *
 * IMPLÉMENTATION:
 * - La fonction logout() dans AppContext:
 *   1. Efface le localStorage (TOKEN, USER, AUTHENTICATED)
 *   2. Réinitialise tous les states (isAuthenticated = false, userId = null, etc)
 *   3. Appelle navigate('/login') pour rediriger
 * - La purge est complète et irréversible
 *
 * FICHIERS AFFECTÉS:
 * - src/contexts/AppContext.jsx (fonction logout + clearSession)
 *
 * EXEMPLE:
 * Utilisateur clique sur "Déconnexion" → logout() → localStorage vide →
 * États réinitialisés → Redirigé vers /login
 */

/**
 * ============================================================================
 * ARCHITECTURE COMPLÈTE
 * ============================================================================
 *
 * 1. AppContext.jsx (Gestion d'état + localStorage)
 *    - State: isAuthenticated, userRole, displayName, userId, authToken, etc
 *    - Fonctions: login(), logout(), clearSession()
 *    - useEffect: Restaure la session au montage
 *
 * 2. LoginPage.jsx (Authentification)
 *    - Formule de login avec email/password
 *    - Appelle login(userData, token) après reçu du token du backend
 *    - Redirection automatique vers /profile
 *    - Mode démo avec boutons de test
 *
 * 3. Navbar.jsx (Déconnexion)
 *    - Menu utilisateur avec bouton logout
 *    - Appelle logout() sur clique
 *    - Affiche displayName de l'utilisateur connecté
 *    - Affiche lien de connexion si pas authentifié
 *
 * 4. App.jsx (Routes)
 *    - Import LoginPage et utilise dans la route /login
 *    - AppProvider enveloppe toutes les routes
 *
 * 5. main.jsx (Setup)
 *    - BrowserRouter enveloppe App
 *    - AppProvider peut utiliser useNavigate()
 */

/**
 * ============================================================================
 * INTÉGRATION AVEC LE BACKEND
 * ============================================================================
 *
 * LoginPage.jsx attend une réponse du backend au format:
 * {
 *   token: "eyJhbGc...",  // JWT token
 *   user: {
 *     id: "uuid-string",
 *     role: "STUDENT" | "ORGANIZER",
 *     displayName: "John Doe",
 *     email: "john@example.com"
 *   }
 * }
 *
 * Adapter l'URL et la structure selon votre backend:
 * const response = await fetch('YOUR_API_ENDPOINT', {...})
 */

/**
 * ============================================================================
 * CHECKLIST D'IMPLÉMENTATION
 * ============================================================================
 *
 * ✓ AppContext.jsx mise à jour avec persistance + login + logout
 * ✓ LoginPage.jsx créée avec exemple d'utilisation
 * ✓ Navbar.jsx mise à jour avec logout button
 * ✓ App.jsx mise à jour pour utiliser LoginPage
 *
 * TODO (à faire selon votre setup):
 * - Adapter l'URL de l'API de login dans LoginPage.jsx
 * - Adapter la structure de réponse selon votre backend
 * - Tester le flow: login → refresh → logout
 * - Ajouter middleware d'authentification (token expiré, etc)
 * - Ajouter gestion d'erreurs côté backend
 */

/**
 * ============================================================================
 * TESTING MANUEL
 * ============================================================================
 *
 * Scenario 1: Login → Refresh → Toujours connecté
 * 1. Cliquer sur "Démo Étudiant" dans LoginPage
 * 2. Être redirigé vers /profile
 * 3. Rafraîchir la page (F5)
 * 4. Vérifier que vous êtes toujours connecté (pas redirigé vers /login)
 * 5. Ouvrir DevTools → Application → LocalStorage → Vérifier authToken et userData
 *
 * Scenario 2: Logout
 * 1. Être connecté (ou faire un demo login)
 * 2. Cliquer sur le nom utilisateur dans la Navbar
 * 3. Cliquer sur "Déconnexion"
 * 4. Être redirigé vers /login
 * 5. Ouvrir DevTools → Application → LocalStorage → Vérifier que localStorage est vide
 *
 * Scenario 3: Expiration Token (À implémenter)
 * Cette implémentation actuelle ne gère pas l'expiration du token JWT.
 * À ajouter:
 * - Decoder le JWT pour vérifier l'expiration
 * - Si expiré, auto-logout
 * - Ajouter refresh token logic si nécessaire
 */

export {}
