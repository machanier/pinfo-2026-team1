Feature: Création et publication d'un événement

  Background:
    # Login en tant qu'organisateur avant chaque scénario
    * call read('classpath:ui/lib/login.feature') { role: 'ORGANIZER' }

  @EventCreation
  Scenario: Créer un nouvel événement
    * def oLocators = read('classpath:ui/locators.json').event
    * def title = "Test 1"
    * def loc = "Amphi A"
    * def capacity = '10'
    * def time = "10 20 2099 10 00"
    * def description = "Test 1"
    * def category = 'Conférence'

    * waitFor(oLocators.newEvent)
    * highlight(oLocators.newEvent, highlightFlashMs)
    * click(oLocators.newEvent)

    * waitFor(oLocators.inputTitle)
    * highlight(oLocators.inputTitle, highlightFlashMs)
    * input(oLocators.inputTitle, title)

    * waitFor(oLocators.inputLoc)
    * highlight(oLocators.inputLoc, highlightFlashMs)
    * input(oLocators.inputLoc, loc)

    * waitFor(oLocators.inputCapacity)
    * highlight(oLocators.inputCapacity, highlightFlashMs)
    * input(oLocators.inputCapacity, capacity)

    * waitFor(oLocators.inputDate)
    * highlight(oLocators.inputDate, highlightFlashMs)
    * input(oLocators.inputDate, time)

    * waitFor(oLocators.description)
    * highlight(oLocators.description, highlightFlashMs)
    * input(oLocators.description, description)

    * waitFor(oLocators.categoryDropdown)
    * highlight(oLocators.categoryDropdown, highlightFlashMs)
    * click(oLocators.categoryDropdown)
    * delay(highlightMs)
    * script("document.querySelector('select[name=category]').value = 'Conférence'")
    * script("document.querySelector('select[name=category]').dispatchEvent(new Event('input', { bubbles: true }))")
    * script("document.querySelector('select[name=category]').dispatchEvent(new Event('change', { bubbles: true }))")
    * delay(highlightMs)

    * waitFor(oLocators.submit)
    * highlight(oLocators.submit, highlightFlashMs)
    * click(oLocators.submit)

    * waitFor(oLocators.seeEventLink)
    * highlight(oLocators.seeEventLink, highlightFlashMs)
    * click(oLocators.seeEventLink)

    * waitFor(oLocators.publishEvent)
    * highlight(oLocators.publishEvent, highlightFlashMs)
    * click(oLocators.publishEvent)

    * delay(3000)
    * driver.refresh()

    * waitFor(oLocators.publishedStatus)

    * def displayedTitle = text("h1")
    * def displayedPlace = script("Array.from(document.querySelectorAll('dt')).find(el => el.textContent.includes('Lieu'))?.nextElementSibling?.textContent?.trim()")
    * def displayedCapacity = script("Array.from(document.querySelectorAll('dt')).find(el => el.textContent.includes('Places restantes'))?.nextElementSibling?.textContent?.trim()")
    * def displayedCategory = text(oLocators.category)

    Then match displayedTitle contains title
    Then match displayedPlace == loc
    Then match displayedCapacity contains capacity
    Then match displayedCategory == category

    Then match driver.url contains appUrl
