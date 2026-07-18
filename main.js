const form = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city");
const submitButton = document.querySelector("#weather-button");
const status = document.querySelector("#status");
const currentWeather = document.querySelector("#current-weather");
const resultHeading = document.querySelector("#result-heading");
const locationDetail = document.querySelector("#location-detail");
const conditionDetail = document.querySelector("#condition-detail");
const unitToggle = document.querySelector("#unit-toggle");
const forecast = document.querySelector("#forecast");
const searchHistory = document.querySelector("#search-history");
const emptyHistory = document.querySelector("#empty-history");

const state = {
  unit: "F",
  currentCity: null,
  weatherByCity: new Map(),
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
  const suffix = state.unit === "F" ? "F" : "C";
  return day[`${field}${suffix}`];
}

function dayLabel(index) {
  if (index === 0) return "Today";
  const date = new Date();
  date.setDate(date.getDate() + index);
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Loading…" : "Get weather";
  form.setAttribute("aria-busy", String(isLoading));
}

function showStatus(message, tone = "neutral") {
  status.textContent = message;
  status.dataset.tone = tone;
  status.classList.remove("hidden");
  currentWeather.classList.add("hidden");
  forecast.classList.add("hidden");
}

function renderForecast(weatherDays) {
  forecast.replaceChildren();
  weatherDays.slice(0, 3).forEach((day, index) => {
    const card = document.createElement("article");
    card.className = "forecast-card";

    const heading = document.createElement("h3");
    heading.textContent = dayLabel(index);

    const condition = document.createElement("p");
    condition.className = "forecast-condition";
    condition.textContent = day.hourly?.[4]?.weatherDesc?.[0]?.value ?? "Forecast unavailable";

    const range = document.createElement("p");
    range.textContent = `High ${temperature(weatherValue(day, "maxtemp"))} · Low ${temperature(weatherValue(day, "mintemp"))}`;

    const average = document.createElement("p");
    average.textContent = `Average ${temperature(weatherValue(day, "avgtemp"))}`;

    card.append(heading, condition, range, average);
    forecast.append(card);
  });
}

function renderHistory() {
  searchHistory.replaceChildren();
  emptyHistory.classList.toggle("hidden", state.weatherByCity.size > 0);

  state.weatherByCity.forEach((weather, city) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const feelsLike = weather.current_condition[0][`FeelsLike${state.unit}`];
    button.type = "button";
    button.className = "history-button";
    button.dataset.city = city;
    button.textContent = `${city} · ${temperature(feelsLike)}`;
    item.append(button);
    searchHistory.append(item);
  });
}

function renderWeather(city, weather) {
  const area = weather.nearest_area?.[0];
  const current = weather.current_condition?.[0];

  if (!area || !current || !Array.isArray(weather.weather)) {
    throw new Error("The weather service returned incomplete data.");
  }

  const locationParts = [area.areaName?.[0]?.value, area.region?.[0]?.value, area.country?.[0]?.value].filter(Boolean);
  const feelsLike = current[`FeelsLike${state.unit}`];
  const description = current.weatherDesc?.[0]?.value ?? "Conditions unavailable";

  state.currentCity = city;
  resultHeading.textContent = city;
  locationDetail.textContent = locationParts.join(", ");
  conditionDetail.textContent = `${description} · Feels like ${temperature(feelsLike)}`;
  unitToggle.textContent = state.unit === "F" ? "Show °C" : "Show °F";
  unitToggle.setAttribute("aria-pressed", String(state.unit === "C"));
  renderForecast(weather.weather);
  renderHistory();

  status.classList.add("hidden");
  currentWeather.classList.remove("hidden");
  forecast.classList.remove("hidden");
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
    showStatus("Enter a city before searching.", "error");
    cityInput.focus();
    return;
  }

  setLoading(true);
  showStatus(`Loading weather for ${city}…`);

  try {
    const weather = await fetchWeather(city);
    state.weatherByCity.set(city, weather);
    renderWeather(city, weather);
    cityInput.value = "";
  } catch (error) {
    console.error(error);
    showStatus(`We couldn't load weather for ${city}. Check the city name and try again.`, "error");
  } finally {
    setLoading(false);
  }
});

unitToggle.addEventListener("click", () => {
  state.unit = state.unit === "F" ? "C" : "F";
  const weather = state.weatherByCity.get(state.currentCity);
  if (weather) renderWeather(state.currentCity, weather);
});

searchHistory.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-city]");
  if (!button) return;
  const city = button.dataset.city;
  const weather = state.weatherByCity.get(city);
  if (weather) renderWeather(city, weather);
});
