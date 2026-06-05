// ─────────────────────────────────────────────────────────────────────────────
// Karate configuration globale
//
// Utilisation:
//   mvn test -Dkarate.env=dev (par défaut: local Docker Compose stack)
//   mvn test -Dkarate.env=prod (production microk8s via Cloudflare Tunnel)
// ─────────────────────────────────────────────────────────────────────────────
function fn() {

  const env = karate.env || 'dev';
  karate.log('[karate-config] env:', env);

  // Charger JSON pour l'environnement (dev.json or prod.json)
  const envConfig = read('classpath:' + env + '.json');

  const Helper = Java.type('util.Helper');

  // Déchiffrage du mot de passe
  function dec(encrypted, salt) {
    if (!encrypted || encrypted === '' || ('' + encrypted).indexOf('REPLACE_') === 0) {
      karate.log('[karate-config] WARNING: credential not set for salt:', salt);
      return '';
    }
    try {
      return Helper.decryptData('' + encrypted, '' + salt);
    } catch (e) {
      karate.log('[karate-config] ERROR: decryption failed for salt:', salt, '-', e.message);
      return '';
    }
  }

  // Environment override helper pour les données de config sensibles
  function envOrConfig(envName, configValue) {
    const envValue = java.lang.System.getenv(envName);
    return (envValue != null && ('' + envValue).trim() !== '') ? ('' + envValue) : configValue;
  }

  const baseUrl = (env === 'prod' && java.lang.System.getenv('PROD_BASE_URL'))
                    ? java.lang.System.getenv('PROD_BASE_URL')
                    : envConfig.baseUrl;

  const auth0ClientId = envOrConfig('AUTH0_CLIENT_ID', envConfig.auth0ClientId);

  // Emails des comptes de test: surcharge possible via TEST_*_EMAIL (ex: Doppler),
  // sinon valeur du JSON (dev.json / prod.json).
  const organizerEmail = envOrConfig('TEST_ORGANIZER_EMAIL', envConfig.testOrganizerEmail);
  const studentEmail   = envOrConfig('TEST_STUDENT_EMAIL',   envConfig.testStudentEmail);
  const adminEmail     = envOrConfig('TEST_ADMIN_EMAIL',     envConfig.testAdminEmail);

  const organizerPasswordEnc = envOrConfig('TEST_ORGANIZER_PASSWORD_ENC', envConfig.testOrganizerPasswordEnc);
  const studentPasswordEnc = envOrConfig('TEST_STUDENT_PASSWORD_ENC', envConfig.testStudentPasswordEnc);
  const adminPasswordEnc = envOrConfig('TEST_ADMIN_PASSWORD_ENC', envConfig.testAdminPasswordEnc);

  // Mot de passe en clair: priorité à TEST_*_PASSWORD (ex: Doppler), sinon on
  // déchiffre TEST_*_PASSWORD_ENC (ou la valeur du JSON). Permet d'utiliser
  // Doppler en clair, sans le chiffrement AES (de toute façon faible ici: la
  // "clé" de déchiffrement est l'email, stocké juste à côté du chiffré).
  function resolvePassword(plainEnvName, encValue, email) {
    const plain = java.lang.System.getenv(plainEnvName);
    if (plain != null && ('' + plain).trim() !== '') return '' + plain;
    return dec(encValue, email);
  }
  const organizerPassword = resolvePassword('TEST_ORGANIZER_PASSWORD', organizerPasswordEnc, organizerEmail);
  const studentPassword   = resolvePassword('TEST_STUDENT_PASSWORD',   studentPasswordEnc,   studentEmail);
  const adminPassword     = resolvePassword('TEST_ADMIN_PASSWORD',     adminPasswordEnc,     adminEmail);

  // Utilisation:
  //   * def token = call getAuth0Token { role: 'ORGANIZER' }
  //   * def token = call getAuth0Token { role: 'STUDENT'   }
  //   * def token = call getAuth0Token { role: 'ADMIN'     }
  function getAuth0Token(args) {
    const role  = (args && args.role) ? args.role.toUpperCase() : 'STUDENT';
    const email    = (role === 'ORGANIZER') ? organizerEmail
                   : (role === 'ADMIN')     ? adminEmail
                   :                          studentEmail;
    const password = (role === 'ORGANIZER') ? organizerPassword
                   : (role === 'ADMIN')     ? adminPassword
                   :                          studentPassword;

    const payload = {
      auth0Domain:   envConfig.auth0Domain,
      client_id:     auth0ClientId,
      audience:      envConfig.auth0Audience,
      grant_type:    'password',
      username:      email,
      password:      password,
      scope:         'openid profile email'
    };

    const response = karate.call('classpath:auth/auth0-token.feature', payload);
    return response.access_token;
  }

  function getDecryptedPassword(args) {
    const role = (args && args.role) ? args.role.toUpperCase() : 'STUDENT';
    return (role === 'ORGANIZER') ? organizerPassword
         : (role === 'ADMIN')     ? adminPassword
         :                          studentPassword;
  }

  // Browser / WebDriver defaults
  //
  //   -Dheadless=false          ouvre une vraie page du browser (default: true)
  //   -Dhighlight=false         surligne les éléments ciblés par les tests (default: true en headless, false sinon)
  //   -DhighlightDuration=1200  durée du surlignage en ms (default: 800)
  //   -DappUrl=http://localhost:5173   URL de l'application pour les tests UI (default: baseUrl, i.e. Kong / nginx)
  //   -DbrowserType=chrome      type de browser: chrome | safaridriver | geckodriver (default: geckodriver / Firefox)
  //
  const browserType      = karate.properties['browserType'] || 'geckodriver';

  const headlessFlag     = karate.properties['headless'];
  // Safari (safaridriver) ne sait pas tourner en headless -> on force headed.
  const isHeadless       = (browserType === 'safaridriver') ? false
                         : (headlessFlag == null ? true : headlessFlag === 'true');

  const highlightFlag    = karate.properties['highlight'];
  const isHighlight      = highlightFlag == null ? !isHeadless : highlightFlag === 'true';

  const durationStr      = karate.properties['highlightDuration'];
  const highlightMs      = durationStr == null ? 900 : parseInt(durationStr);

  const flashStr         = karate.properties['highlightFlash'];
  const highlightFlashMs = flashStr == null ? 800 : parseInt(flashStr);

  const appUrl = karate.properties['appUrl']
               || (env === 'prod' ? 'https://pinfo1.p-info.net' : baseUrl);

  const config = {
    env:     env,
    baseUrl: baseUrl,

    // Auth0
    auth0Domain:     envConfig.auth0Domain,
    auth0ClientId:   auth0ClientId,
    auth0Audience:   envConfig.auth0Audience,
    auth0RolesClaim: 'https://unigevents.com/roles',

    // Comptes test user
    testOrganizerEmail: organizerEmail,
    testStudentEmail:   studentEmail,
    testAdminEmail:     adminEmail,

    // Mots de passe chiffrés (chargés depuis variables d'environnement si présentes)
    testOrganizerPasswordEnc: organizerPasswordEnc,
    testStudentPasswordEnc:   studentPasswordEnc,
    testAdminPasswordEnc:     adminPasswordEnc,

    // Mots de passe en clair résolus (TEST_*_PASSWORD via Doppler, sinon déchiffrés)
    testOrganizerPassword: organizerPassword,
    testStudentPassword:   studentPassword,
    testAdminPassword:     adminPassword,

    // Helper class (exposé pour que les appels imbriqués puissent utiliser decryptData)
    Helper: Helper,

    // Token helper
    getAuth0Token: getAuth0Token,
    // Helper pour récupérer les mots de passe en clair dans les tests UI
    getDecryptedPassword: getDecryptedPassword,

    // URLs des services (Kong / nginx en dev, microk8s en prod)
    serviceUrls: envConfig.serviceUrls,

    // UI / WebDriver settings
    browserType:      browserType,
    appUrl:           appUrl,
    isHeadless:       isHeadless,
    isHighlight:      isHighlight,
    highlightMs:      highlightMs,
    highlightFlashMs: highlightFlashMs
  };

  // Settings globaux de Karate
  karate.configure('ssl', true);
  karate.configure('connectTimeout', 10000);
  karate.configure('readTimeout', 30000);
  karate.configure('driver', {
    type:              browserType,
    headless:          isHeadless,
    timeout:           30000,
    highlight:         isHighlight,
    highlightDuration: highlightFlashMs,
    showDriverLog:     false  // Empêche le logging de mots de passe dans les requêtes HTTP WebDriver
  });
  // Désactive le log "pretty" des requêtes et réponses HTTP pour éviter de surcharger les rapports avec des données sensibles (tokens, etc.).
  // Disponible par feature via "configure logPrettyRequest = true" ou "configure logPrettyResponse = true" pour les étapes où c'est utile pour le debugging.
  karate.configure('logPrettyRequest', false);
  karate.configure('logPrettyResponse', false);
  karate.configure('report', { showLog: true, showAllSteps: true });


  karate.log('[karate-config] baseUrl    :', baseUrl);
  karate.log('[karate-config] auth0Domain:', envConfig.auth0Domain);
  karate.log('[karate-config] browserType:', browserType);
  karate.log('[karate-config] headless   :', isHeadless);
  karate.log('[karate-config] highlight  :', isHighlight);

  return config;
}