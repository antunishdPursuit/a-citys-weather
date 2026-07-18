describe("A City's Weather", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("preserves the original weather search interface", () => {
    cy.get("#weatherCity").should("have.attr", "aria-label", "Weather search");
    cy.get("#city").should("have.attr", "placeholder", "Enter a City");
    cy.get("#weather_button").should("have.text", "Get Weather");
    cy.get("#motion-toggle").should("have.text", "Pause motion");
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
    cy.get(".weather-emoji").should("have.length", 5);
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

  it("pauses and resumes the animated weather layers", () => {
    cy.get("#motion-toggle").click();

    cy.get("body").should("have.class", "motion-paused");
    cy.get("#motion-toggle").should("have.text", "Play motion").and("have.attr", "aria-pressed", "true");
    cy.get(".cloud").should("have.css", "animation-play-state", "paused");

    cy.get("#motion-toggle").click();
    cy.get("body").should("not.have.class", "motion-paused");
    cy.get("#motion-toggle").should("have.text", "Pause motion").and("have.attr", "aria-pressed", "false");
  });

  it("keeps the desktop weather composition intact", () => {
    cy.viewport(1440, 900);
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("desktopWeather");

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@desktopWeather");

    cy.window().then((window) => {
      expect(window.document.documentElement.scrollWidth).to.be.at.most(window.innerWidth);
    });
    cy.get("#cityInfo").then(($city) => {
      cy.get(".mainPage > aside:last-child").then(($history) => {
        expect($city[0].getBoundingClientRect().right).to.be.lessThan($history[0].getBoundingClientRect().left);
      });
    });
    cy.get(".tempertures").should("have.length", 3).and("be.visible");
    cy.get(".weather-footer").should("have.css", "position", "fixed");
  });

  it("stacks the weather experience cleanly on phones", () => {
    cy.viewport(390, 844);
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("mobileWeather");

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@mobileWeather");

    cy.window().then((window) => {
      expect(window.document.documentElement.scrollWidth).to.be.at.most(window.innerWidth);
      const city = window.document.querySelector("#cityInfo").getBoundingClientRect();
      expect(city.left).to.be.at.least(0);
      expect(city.right).to.be.at.most(window.innerWidth);
    });
    cy.get("#temps").then(($forecast) => {
      cy.get(".mainPage > aside:last-child").then(($history) => {
        expect($history[0].getBoundingClientRect().top).to.be.at.least($forecast[0].getBoundingClientRect().bottom);
      });
      cy.get(".weather-footer").then(($footer) => {
        expect($footer[0].getBoundingClientRect().top).to.be.at.least($forecast[0].getBoundingClientRect().bottom);
      });
    });
    cy.get(".weather-footer").should("have.css", "position", "static");
  });
});
