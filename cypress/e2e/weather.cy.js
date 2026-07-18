describe("A City's Weather", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("starts with an accessible search and an empty state", () => {
    cy.get("h1").should("have.text", "A City's Weather");
    cy.get("label[for='city']").should("have.text", "City");
    cy.get("#status").should("contain.text", "Choose a city");
    cy.get("#empty-history").should("be.visible");
  });

  it("renders current conditions and three forecast cards", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("melbourneWeather");

    cy.get("#city").type("melbourne");
    cy.get("#weather-button").click();
    cy.wait("@melbourneWeather");

    cy.get("#result-heading").should("have.text", "Melbourne");
    cy.get("#location-detail").should("contain.text", "Victoria").and("contain.text", "Australia");
    cy.get("#condition-detail").should("contain.text", "47 °F");
    cy.get(".forecast-card").should("have.length", 3);
    cy.get("#search-history").should("contain.text", "Melbourne");
  });

  it("toggles units and reuses cached search history", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("melbourneWeather");

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@melbourneWeather");
    cy.get("#unit-toggle").click();

    cy.get("#condition-detail").should("contain.text", "8 °C");
    cy.get(".forecast-card").first().should("contain.text", "12 °C");
    cy.get(".history-button").click();
    cy.get("#result-heading").should("have.text", "Melbourne");
  });

  it("shows a useful message when the weather request fails", () => {
    cy.intercept("GET", "https://wttr.in/Nowhere?format=j1", {
      statusCode: 500,
      body: {},
    }).as("failedWeather");

    cy.get("#city").type("Nowhere").type("{enter}");
    cy.wait("@failedWeather");

    cy.get("#status")
      .should("be.visible")
      .and("contain.text", "couldn't load weather for Nowhere");
    cy.get("#weather-button").should("not.be.disabled");
  });
});
