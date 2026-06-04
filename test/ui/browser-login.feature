Feature: Login d'utilisateurs

  @BrowserLogin
  Scenario Outline: Log in en tant que <role> and vérification du navbar
    * call read('classpath:ui/lib/login.feature') { role: '<role>' }

    Then match driver.url contains appUrl
    And match driver.title contains 'UNIGEvents'

    Examples:
      | role      |
      | STUDENT   |
      | ORGANIZER |
      | ADMIN     |




