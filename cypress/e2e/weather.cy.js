describe("A City's Weather", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("preserves the original weather search interface", () => {
    cy.get("#weatherCity").should("have.attr", "aria-label", "Weather search");
    cy.get("#city").should("have.attr", "placeholder", "Enter a City");
    cy.get("#weather_button").should("have.text", "Get Weather");
    cy.get(".cloud").should("have.length", 6);
    cy.get("#removed").should("contain.text", "No previous searches");
  });

  it("renders the original panels and weather artwork", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("melbourneWeather");

    cy.get("#city").type("melbourne");
    cy.get("#weather_button").click();
    cy.wait("@melbourneWeather");

    cy.get("#cityName").should("have.text", "Melbourne");
    cy.get("#cityInfo").should("contain.text", "Victoria").and("contain.text", "Australia");
    cy.get("#cityInfo").should("contain.text", "47 °F");
    cy.get(".tempertures").should("have.length", 3).and("be.visible");
    cy.get("#list").should("contain.text", "Melbourne");
    cy.get(".cloud").should("have.css", "background-image").and("include", "partly-cloudy.png");
  });

  it("toggles units and reuses cached search history", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("melbourneWeather");

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@melbourneWeather");
    cy.get(".degreeCToF").click();

    cy.get("#cityInfo").should("contain.text", "8 °C");
    cy.get("#today").should("contain.text", "12 °C");
    cy.get(".previousCity").click();
    cy.get("#cityName").should("have.text", "Melbourne");
  });

  it("shows the original invalid-city state on failure", () => {
    cy.intercept("GET", "https://wttr.in/Nowhere?format=j1", {
      statusCode: 500,
      body: {},
    }).as("failedWeather");

    cy.get("#city").type("Nowhere").type("{enter}");
    cy.wait("@failedWeather");

    cy.get("#cityName").should("have.text", "City Invalid");
    cy.get("#weather_button").should("not.be.disabled").and("have.text", "Get Weather");
    cy.get("#temps").should("not.be.visible");
  });
});
