describe("A City's Weather", () => {
  function visitWithLanguages(languages) {
    cy.visit("/", {
      onBeforeLoad(window) {
        Object.defineProperty(window.navigator, "languages", {
          configurable: true,
          value: languages,
        });
      },
    });
  }

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
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=en", {
      fixture: "melbourne.json",
    }).as("melbourneWeather");

    cy.get("#city").type("melbourne");
    cy.get("#weather_button").click();
    cy.wait("@melbourneWeather");

    cy.get("#cityName").should("have.text", "Melbourne");
    cy.get("#cityInfo").should("contain.text", "Victoria").and("contain.text", "Australia");
    cy.get("#cityInfo").should("contain.text", "47 °F");
    cy.get(".tempertures").should("have.length", 3).and("be.visible");
    cy.get("#temps").should("not.contain.text", "At 12:00 PM");
    cy.get(".condition").should("not.exist");
    cy.get("#list").should("contain.text", "Melbourne");
    cy.get(".cloud").should("have.css", "background-image").and("include", "partly-cloudy.png");
    cy.get(".weather-emoji").should("have.length", 5);
  });

  it("toggles units and reuses cached search history", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City?format=j1&lang=en", {
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
      cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City?format=j1&lang=en", weather).as(
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
    cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Ho%20Chi%20Minh%20City%2C%20O?format=j1&lang=en", {
      fixture: "melbourne.json",
    }).as("ordinaryWeather");

    cy.get("#city").type("Ho  Chi Minh City, O").type("{enter}");
    cy.wait("@ordinaryWeather");

    cy.get("#cityName").should("have.text", "Ho Chi Minh City, O");
    cy.get(".surprise-heart").should("not.exist");
  });

  it("uses one coherent visual theme for the returned condition", () => {
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Nowhere?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Incomplete?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Nowhere?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=en", {
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

  it("uses Spanish browser preferences for the interface, weather request, and date", () => {
    cy.viewport(390, 844);
    visitWithLanguages(["es-MX", "en-US"]);

    cy.fixture("melbourne.json").then((weather) => {
      weather.current_condition[0].lang_es = [{ value: "Parcialmente nublado" }];
      cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=es", weather).as(
        "spanishWeather",
      );
    });

    cy.get("html").should("have.attr", "lang", "es");
    cy.get("h1").should("have.text", "El clima de una ciudad");
    cy.get("#city").should("have.attr", "placeholder", "Ingresa una ciudad");
    cy.get("#weather_button").should("have.text", "Ver el clima");
    cy.get("#language-support").should(
      "have.text",
      "Idiomas disponibles: inglés, español y vietnamita.",
    );

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@spanishWeather");
    cy.get(".current-condition").should("have.text", "Parcialmente nublado");
    cy.get("#cityInfo").should("contain.text", "Sensación térmica").and("contain.text", "Observado");
    cy.window().then((window) => {
      const expectedDate = new window.Intl.DateTimeFormat("es").format(new window.Date());
      cy.get("#today .days").should("have.text", expectedDate);
      expect(window.document.documentElement.scrollWidth).to.be.at.most(window.innerWidth);
    });
  });

  it("uses Vietnamese browser preferences and requests Vietnamese weather text", () => {
    cy.viewport(390, 844);
    visitWithLanguages(["vi-VN", "en-US"]);

    cy.fixture("melbourne.json").then((weather) => {
      weather.current_condition[0].lang_vi = [{ value: "Có mây" }];
      cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=vi", weather).as(
        "vietnameseWeather",
      );
    });

    cy.get("html").should("have.attr", "lang", "vi");
    cy.get("h1").should("have.text", "Thời tiết của một thành phố");
    cy.get("#weather_button").should("have.text", "Xem thời tiết");
    cy.get("#language-support").should(
      "have.text",
      "Ngôn ngữ được hỗ trợ: tiếng Anh, tiếng Tây Ban Nha và tiếng Việt.",
    );

    cy.get("#city").type("Melbourne").type("{enter}");
    cy.wait("@vietnameseWeather");
    cy.get(".current-condition").should("have.text", "Có mây");
    cy.get("#cityInfo").should("contain.text", "Cảm giác như").and("contain.text", "Quan sát lúc");
    cy.window().then((window) => {
      expect(window.document.documentElement.scrollWidth).to.be.at.most(window.innerWidth);
    });
  });

  it("falls back to English when the browser language is unsupported", () => {
    visitWithLanguages(["fr-CA"]);

    cy.get("html").should("have.attr", "lang", "en");
    cy.get("h1").should("have.text", "A City's Weather");
    cy.get("#weather_button").should("have.text", "Get Weather");
    cy.get("#language-support").should(
      "have.text",
      "Languages supported: English, Spanish, and Vietnamese.",
    );
  });

  it("keeps the footer below results on a short desktop viewport", () => {
    cy.viewport(1440, 600);
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=en", {
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
    cy.intercept("GET", "https://wttr.in/Melbourne?format=j1&lang=en", {
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
