# ─────────────────────────────────────────────────────────────────────────────
# One-shot credential encryption utility
#
# Run this feature once to generate the AES-256 encrypted values that go
# into dev.json / prod.json.  It prints the ciphertext to the Karate log
# and does not make any HTTP call.
#
# How to run:
#   cd backend
#   ./mvnw -pl e2e test -Dkarate.env=dev \
#          -Dkarate.options="classpath:util/encrypt-credentials.feature"
#
# Then copy each "ENC >>>" line into the matching *Enc field in your JSON.

Feature: Generate AES-256 encrypted credential values for dev.json / prod.json

  Scenario: Encrypt organizer test-account password
    * def email     = 'REPLACE_WITH_TEST_ORGANIZER_EMAIL'
    * def password  = 'REPLACE_WITH_TEST_ORGANIZER_PWD'
    * def Helper    = Java.type('util.Helper')
    * def encrypted = Helper.encryptData(password, email)
    * print 'ENC >>> testOrganizerPasswordEnc =', encrypted

  Scenario: Encrypt student test-account password
    * def email     = 'REPLACE_WITH_TEST_STUDENT_EMAIL'
    * def password  = 'REPLACE_WITH_TEST_STUDENT_PWD'
    * def Helper    = Java.type('util.Helper')
    * def encrypted = Helper.encryptData(password, email)
    * print 'ENC >>> testStudentPasswordEnc =', encrypted

  Scenario: Encrypt admin test-account password
    * def email     = 'REPLACE_WITH_TEST_ADMIN_EMAIL'
    * def password  = 'REPLACE_WITH_TEST_ADMIN_PWD'
    * def Helper    = Java.type('util.Helper')
    * def encrypted = Helper.encryptData(password, email)
    * print 'ENC >>> testAdminPasswordEnc =', encrypted
