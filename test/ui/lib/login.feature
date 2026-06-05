Feature: UI login helpers

  @ignore
  Scenario: Login en tant que rôle
    * def oLocators = read('classpath:ui/locators.json').login

    * def email = __arg.role == 'ORGANIZER' ? testOrganizerEmail : __arg.role == 'ADMIN' ? testAdminEmail : testStudentEmail
    * def password = __arg.role == 'ORGANIZER' ? testOrganizerPassword : __arg.role == 'ADMIN' ? testAdminPassword : testStudentPassword

    # Ouvrir l'application
    * driver appUrl

    * waitFor(oLocators.loginButton)
    * highlight(oLocators.loginButton, highlightFlashMs)
    * click(oLocators.loginButton)

    * delay(highlightMs)
    * waitFor(oLocators.connect)
    * highlight(oLocators.connect, highlightFlashMs)
    * click(oLocators.connect)

    * delay(highlightMs)
    * waitFor(oLocators.usernameInput)
    * highlight(oLocators.usernameInput, highlightFlashMs)
    * input(oLocators.usernameInput, email)

    * delay(highlightMs)
    * waitFor(oLocators.passwordInput)
    * highlight(oLocators.passwordInput, highlightFlashMs)
    * input(oLocators.passwordInput, password)
    * waitFor(oLocators.submit)
    * highlight(oLocators.submit, highlightFlashMs)
    * click(oLocators.submit)

    * waitFor(oLocators.userMenu)
    * highlight(oLocators.userMenu, highlightFlashMs)