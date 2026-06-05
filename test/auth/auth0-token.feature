# ─────────────────────────────────────────────────────────────────────────────
# Récupère un access_token Auth0 via le flow Resource Owner Password (ROPG).
#
# Appelé depuis karate-config.js (getAuth0Token). N'est jamais exécuté seul
# (@ignore) — uniquement via `karate.call`. Arguments attendus (passés par le
# payload de getAuth0Token):
#   auth0Domain, client_id, audience, grant_type, username, password, scope
#
# Pré-requis tenant: le grant "password" (ROPG) doit être activé sur
# l'application Auth0 ET une connexion par défaut configurée. Si ce n'est pas
# le cas sur le tenant, utilise plutôt le login UI (ui/lib/login.feature).
# ─────────────────────────────────────────────────────────────────────────────
@ignore
Feature: Auth0 access token (Resource Owner Password grant)

  Scenario: Obtenir un access_token
    Given url 'https://' + auth0Domain + '/oauth/token'
    And header Content-Type = 'application/json'
    And request { client_id: '#(client_id)', audience: '#(audience)', grant_type: '#(grant_type)', username: '#(username)', password: '#(password)', scope: '#(scope)' }
    When method post
    Then status 200
    * def access_token = response.access_token
