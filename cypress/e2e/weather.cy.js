describe("A City's Weather", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("preserves the original weather search interface", () => {
    cy.get("#weatherCity").should("have.attr", "aria-label", "Weather search");
    cy.get("#city").should("have.attr", "placeholder", "Enter a City");
    cy.get("#weather_button").should("have.text", "Get Weather");
    cy.get("#motion-toggle").should("have.text", "Pause motion");
    cy.get("h1").should("have.text", "A City's Weather");
    cy.get("#cityName").should("have.text", "Enter a city to check its weather.");
    cy.get("#cityInfo").should("have.attr", "data-state", "empty").then(($status) => {
      expect($status[0].getBoundingClientRect().height).to.be.lessThan(90);
    });
    cy.get(".cloud").should("have.length", 6);
    cy.get("#historyPanel").should("not.be.visible");
    cy.get("#weather_button").then(($button) => {
      expect(getComputedStyle($button[0], "::after").content).to.equal("none");
    });
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

  it("keeps an ordinary Ho Chi Minh City search in the normal weather state", () => {
    cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City?format=j1", {
      fixture: "melbourne.json",
    }).as("cityWeather");

    cy.get("#city").type("ho chi minh city").type("{enter}");
    cy.wait("@cityWeather");

    cy.get("#cityName").should("have.text", "Ho Chi Minh City");
    cy.get(".surprise-heart").should("not.exist");
  });

  it("repairs the known Da Kao encoding defect from the weather provider", () => {
    cy.fixture("melbourne.json").then((weather) => {
      weather.nearest_area[0].areaName[0].value = "Ã\u0090A Kao";
      weather.nearest_area[0].country[0].value = "Vietnam";
      weather.nearest_area[0].region[0].value = "";
      cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City?format=j1", weather).as(
        "encodedAreaWeather",
      );
    });

    cy.get("#city").type("Ho Chi Minh City").type("{enter}");
    cy.wait("@encodedAreaWeather");

    cy.get("#cityInfo").should("contain.text", "Đa Kao").and("not.contain.text", "Ã");
    cy.get("#cityInfo .region-line").should("not.exist");
    cy.get("#cityInfo .country-line").should("have.text", "Vietnam");
  });

  it("activates the protected city state only for the exact secret input", () => {
    cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City?format=j1", {
      fixture: "melbourne.json",
    }).as("secretWeather");

    cy.get("#city").type("hO cHi MiNh CiTy, o").type("{enter}");
    cy.wait("@secretWeather");

    cy.get("#cityName").should("have.text", "Love U");
    cy.get(".surprise-heart").should("have.length", 6);
    cy.get("#list").should("contain.text", "Ho Chi Minh City").and("not.contain.text", ", O");

    cy.get(".previousCity").click();
    cy.get("#cityName").should("have.text", "Ho Chi Minh City");
    cy.get(".surprise-heart").should("not.exist");
  });

  it("requires the secret input's exact internal spacing", () => {
    cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City%2C%20O?format=j1", {
      fixture: "melbourne.json",
    }).as("ordinaryWeather");

    cy.get("#city").type("Ho  Chi Minh City, O").type("{enter}");
    cy.wait("@ordinaryWeather");

    cy.get("#cityName").should("have.text", "Ho Chi Minh City, O");
    cy.get(".surprise-heart").should("not.exist");
  });

  it("uses one coherent visual theme for the returned condition", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("themedWeather");

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@themedWeather");

    cy.get("body").should("have.attr", "data-weather", "partly-cloudy");
    cy.get(".weather-emoji").should("have.length", 5).each(($emoji) => {
      expect($emoji.text()).to.equal("🌤️");
    });
    cy.get(".cloud").each(($cloud) => {
      expect($cloud.css("background-image")).to.include("partly-cloudy.png");
    });
  });

  it("distinguishes a city that cannot be found", () => {
    cy.intercept("GET", "https://wttr.in/Nowhere?format=j1", {
      statusCode: 404,
      body: {},
    }).as("missingWeather");

    cy.get("#city").type("Nowhere").type("{enter}");
    cy.wait("@missingWeather");

    cy.get("#cityName").should(
      "have.text",
      "We couldn't find weather for “Nowhere.” Check the spelling and try again.",
    );
    cy.get("#cityInfo").should("have.attr", "role", "alert");
  });

  it("does not save an incomplete weather response to history", () => {
    cy.intercept("GET", "https://wttr.in/Incomplete?format=j1", {
      statusCode: 200,
      body: {},
    }).as("incompleteWeather");

    cy.get("#city").type("Incomplete").type("{enter}");
    cy.wait("@incompleteWeather");

    cy.get("#cityName").should(
      "have.text",
      "Weather details for “Incomplete” are incomplete. Please try again later.",
    );
    cy.get("#historyPanel").should("not.be.visible");
  });

  it("distinguishes a weather service failure", () => {
    cy.intercept("GET", "https://wttr.in/Nowhere?format=j1", {
      statusCode: 500,
      body: {},
    }).as("failedWeather");

    cy.get("#city").type("Nowhere").type("{enter}");
    cy.wait("@failedWeather");

    cy.get("#cityName").should("have.text", "The weather service is unavailable right now. Please try again.");
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
    cy.get(".weather-footer").should("have.css", "position", "relative");
  });

  it("keeps the footer below results on a short desktop viewport", () => {
    cy.viewport(1440, 600);
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1", {
      fixture: "melbourne.json",
    }).as("shortViewportWeather");

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@shortViewportWeather");

    cy.get(".mainPage").then(($main) => {
      cy.get(".weather-footer").then(($footer) => {
        expect($footer[0].getBoundingClientRect().top).to.be.at.least(
          $main[0].getBoundingClientRect().bottom,
        );
      });
    });
  });

  it("keeps footer links readable and visibly focused", () => {
    cy.get('.weather-footer a[title="sun icons"]')
      .should("have.css", "color", "rgb(240, 248, 255)")
      .focus()
      .should("have.css", "outline-color", "rgb(244, 185, 66)");
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
    cy.get(".weather-footer").should("have.css", "position", "relative");
  });
});
