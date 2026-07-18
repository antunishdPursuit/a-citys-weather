const mainPage = document.querySelector(".mainPage");
const form = document.querySelector("#weatherCity");
const cityInput = document.querySelector("#city");
const submitButton = document.querySelector("#weather_button");
const cityInfo = document.querySelector("#cityInfo");
const temperatures = document.querySelector("#temps");
const emptyHistory = document.querySelector("#removed");
const searchHistory = document.querySelector("#list");
const cloudContainer = document.querySelector(".cloud-container");
const clouds = document.querySelectorAll(".cloud");
const days = document.querySelectorAll(".days");
const averages = document.querySelectorAll(".avg");
const maximums = document.querySelectorAll(".max");
const minimums = document.querySelectorAll(".min");
const conditions = document.querySelectorAll(".condition");

const state = {
  unit: "F",
  currentCity: null,
  weatherByCity: new Map(),
  weatherIcons: null,
};

function normalizeCity(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function temperature(value, unit = state.unit) {
  return `${value} °${unit}`;
}

function weatherValue(day, field) {
  return day[`${field}${state.unit}`];
}

function forecastDate(index) {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return date.toLocaleDateString("en-US");
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading..." : "Get Weather";
  form.setAttribute("aria-busy", String(isLoading));
}

function showMessage(message) {
  const heading = document.createElement("h2");
  heading.id = "cityName";
  heading.textContent = message;
  cityInfo.replaceChildren(heading);
  temperatures.style.display = "none";
}

function createLabeledParagraph(label, value) {
  const paragraph = document.createElement("p");
  if (label) {
    const strong = document.createElement("strong");
    strong.textContent = label;
    paragraph.append(strong, document.createTextNode(` ${value}`));
  } else {
    paragraph.textContent = value;
  }
  return paragraph;
}

function renderCurrentConditions(city, area, current) {
  const heading = document.createElement("h2");
  heading.id = "cityName";
  const headingText = document.createElement("strong");
  headingText.textContent = city === "Ho Chi Minh City" ? "Love U" : city;
  heading.append(headingText);

  const areaParagraph = createLabeledParagraph("Area:", area.areaName?.[0]?.value ?? "Unknown");
  areaParagraph.className = "location-line";
  const regionParagraph = createLabeledParagraph(
    area.region?.[0]?.value ? "Region:" : "",
    area.region?.[0]?.value ?? "",
  );
  regionParagraph.className = "location-line";
  const countryParagraph = createLabeledParagraph("", area.country?.[0]?.value ?? "");
  countryParagraph.className = "location-line";

  const conditionParagraph = document.createElement("p");
  conditionParagraph.className = "current-summary";
  const description = document.createElement("strong");
  description.className = "current-condition";
  description.style.margin = "0";
  description.textContent = current.weatherDesc?.[0]?.value ?? "Conditions unavailable";

  const temperatureGroup = document.createElement("span");
  temperatureGroup.className = "current-reading";
  const feelsLike = document.createElement("strong");
  feelsLike.className = "current-temperature";
  feelsLike.textContent = temperature(current[`FeelsLike${state.unit}`]);

  const timeGroup = document.createElement("span");
  timeGroup.className = "observed-reading";
  const observedAt = document.createElement("strong");
  observedAt.className = "observed-time";
  observedAt.textContent = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  temperatureGroup.append(document.createTextNode("Feels like "), feelsLike);
  timeGroup.append(document.createTextNode("Observed "), observedAt);
  conditionParagraph.append(description, temperatureGroup, timeGroup);

  const unitButton = document.createElement("button");
  unitButton.type = "button";
  unitButton.className = "degreeCToF";
  unitButton.setAttribute("aria-pressed", String(state.unit === "C"));
  unitButton.textContent = state.unit === "F" ? "Change To °C?" : "Change To °F?";

  cityInfo.replaceChildren(
    heading,
    areaParagraph,
    regionParagraph,
    countryParagraph,
    conditionParagraph,
    unitButton,
  );
}

function renderForecast(weatherDays) {
  weatherDays.slice(0, 3).forEach((day, index) => {
    days[index].replaceChildren();
    const date = document.createElement("strong");
    date.textContent = forecastDate(index);
    days[index].append(date);

    averages[index].replaceChildren();
    const averageLabel = document.createElement("strong");
    averageLabel.textContent = "Avg Temp:";
    averages[index].append(averageLabel, document.createTextNode(` ${temperature(weatherValue(day, "avgtemp"))}`));

    maximums[index].replaceChildren();
    const maximumLabel = document.createElement("strong");
    maximumLabel.textContent = "Max Temp:";
    maximums[index].append(maximumLabel, document.createTextNode(` ${temperature(weatherValue(day, "maxtemp"))}`));

    minimums[index].replaceChildren();
    const minimumLabel = document.createElement("strong");
    minimumLabel.textContent = "Min Temp:";
    minimums[index].append(minimumLabel, document.createTextNode(` ${temperature(weatherValue(day, "mintemp"))}`));

    conditions[index].replaceChildren();
    if (index > 0) {
      const condition = document.createElement("strong");
      condition.textContent = day.hourly?.[4]?.weatherDesc?.[0]?.value ?? "Forecast unavailable";
      conditions[index].append(document.createTextNode("At 12:00 PM "), condition);
    }
  });
}

function createHeart() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("surprise-heart");
  svg.setAttribute("width", "30");
  svg.setAttribute("height", "30");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "red");
  svg.style.position = "absolute";
  svg.style.top = "10px";
  svg.style.left = "10px";

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  );
  svg.append(path);
  return svg;
}

function weatherEmojis(description) {
  const condition = description.toLowerCase();
  if (condition.includes("thunder")) return ["⛈️", "⚡", "🌧️", "⚡", "☁️"];
  if (condition.includes("snow") || condition.includes("blizzard")) return ["❄️", "🌨️", "❄️", "☁️", "❄️"];
  if (condition.includes("ice") || condition.includes("freez") || condition.includes("sleet")) {
    return ["🧊", "🌨️", "❄️", "🧊", "☁️"];
  }
  if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("shower")) {
    return ["🌧️", "💧", "☁️", "💧", "🌦️"];
  }
  if (condition.includes("fog") || condition.includes("mist")) return ["🌫️", "☁️", "🌫️", "☁️", "🌫️"];
  if (condition.includes("cloud") || condition.includes("overcast")) return ["🌤️", "☁️", "🌥️", "☁️", "🌤️"];
  return ["☀️", "✨", "🌤️", "✨", "☀️"];
}

function renderWeatherEmojis(description) {
  cloudContainer.querySelectorAll(".weather-emoji").forEach((emoji) => emoji.remove());
  weatherEmojis(description).forEach((symbol, index) => {
    const emoji = document.createElement("span");
    emoji.className = "weather-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.style.setProperty("--weather-layer", String(index + 1));
    emoji.textContent = symbol;
    cloudContainer.append(emoji);
  });
}

async function updateWeatherBackground(weatherCode, city, description) {
  renderWeatherEmojis(description);
  try {
    if (!state.weatherIcons) {
      const response = await fetch("icons.json");
      if (!response.ok) throw new Error(`Icon request failed with status ${response.status}.`);
      state.weatherIcons = await response.json();
    }

    clouds.forEach((cloud, index) => {
      cloud.querySelectorAll(".surprise-heart").forEach((heart) => heart.remove());
      const conditionArtwork = state.weatherIcons[weatherCode] ?? "url('assets/cloud.webp')";
      cloud.style.backgroundImage = index % 3 === 2 ? "url('assets/cloud.webp')" : conditionArtwork;
      if (city === "Ho Chi Minh City") cloud.append(createHeart());
    });
  } catch (error) {
    console.error("Unable to update weather artwork.", error);
  }
}

function renderHistory() {
  searchHistory.replaceChildren();
  emptyHistory.classList.toggle("hidden", state.weatherByCity.size > 0);

  state.weatherByCity.forEach((weather, city) => {
    const item = document.createElement("li");
    item.className = "searchList";

    const link = document.createElement("a");
    link.className = "previousCity";
    link.href = "#";
    link.dataset.city = city;
    link.textContent = city;

    const currentTemperature = document.createElement("span");
    currentTemperature.className = "current-temp";
    const feelsLike = weather.current_condition[0][`FeelsLike${state.unit}`];
    currentTemperature.textContent = `🌡️ ${temperature(feelsLike)}`;

    item.append(link, currentTemperature);
    searchHistory.append(item);
  });
}

function renderWeather(city, weather) {
  const area = weather.nearest_area?.[0];
  const current = weather.current_condition?.[0];
  const weatherDays = weather.weather;

  if (!area || !current || !Array.isArray(weatherDays) || weatherDays.length < 3) {
    throw new Error("The weather service returned incomplete data.");
  }

  state.currentCity = city;
  mainPage.style.opacity = "1";
  renderCurrentConditions(city, area, current);
  renderForecast(weatherDays);
  renderHistory();
  temperatures.style.display = "flex";
  void updateWeatherBackground(current.weatherCode, city, current.weatherDesc?.[0]?.value ?? "clear");
}

async function fetchWeather(city) {
  const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
  if (!response.ok) throw new Error(`Weather request failed with status ${response.status}.`);
  return response.json();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = normalizeCity(cityInput.value);

  if (!city) {
    mainPage.style.opacity = "1";
    showMessage("Please enter a City");
    cityInput.focus();
    return;
  }

  mainPage.style.opacity = "1";
  showMessage(`Loading weather for ${city}...`);
  setLoading(true);

  try {
    const weather = await fetchWeather(city);
    state.weatherByCity.set(city, weather);
    renderWeather(city, weather);
    cityInput.value = "";
  } catch (error) {
    console.error(error);
    showMessage("City Invalid");
  } finally {
    setLoading(false);
  }
});

cityInfo.addEventListener("click", (event) => {
  const button = event.target.closest("button.degreeCToF");
  if (!button || !state.currentCity) return;

  state.unit = state.unit === "F" ? "C" : "F";
  const weather = state.weatherByCity.get(state.currentCity);
  if (weather) renderWeather(state.currentCity, weather);
});

searchHistory.addEventListener("click", (event) => {
  const link = event.target.closest("a.previousCity[data-city]");
  if (!link) return;

  event.preventDefault();
  const weather = state.weatherByCity.get(link.dataset.city);
  if (weather) renderWeather(link.dataset.city, weather);
});
