import { resolveLocale, SUPPORTED_LOCALES, translate } from "./localization.js";

const mainPage = document.querySelector(".mainPage");
const form = document.querySelector("#weatherCity");
const cityInput = document.querySelector("#city");
const submitButton = document.querySelector("#weather_button");
const languageSelect = document.querySelector("#language-select");
const motionToggle = document.querySelector("#motion-toggle");
const cityInfo = document.querySelector("#cityInfo");
const temperatures = document.querySelector("#temps");
const historyPanel = document.querySelector("#historyPanel");
const emptyHistory = document.querySelector("#removed");
const searchHistory = document.querySelector("#list");
const cloudContainer = document.querySelector(".cloud-container");
const clouds = document.querySelectorAll(".cloud");
const days = document.querySelectorAll(".days");
const averages = document.querySelectorAll(".avg");
const maximums = document.querySelectorAll(".max");
const minimums = document.querySelectorAll(".min");
const SECRET_INPUT = "ho chi minh city, o";
const LANGUAGE_STORAGE_KEY = "weather-language";

function browserLocale() {
  const preferredLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  return resolveLocale(preferredLanguages);
}

function storedLanguagePreference() {
  try {
    const storedPreference = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedPreference === "auto" || SUPPORTED_LOCALES.includes(storedPreference)) {
      return storedPreference;
    }
  } catch (error) {
    console.warn("Unable to read the saved language preference.", error);
  }
  return "auto";
}

const initialLanguagePreference = storedLanguagePreference();

const state = {
  locale: initialLanguagePreference === "auto"
    ? browserLocale()
    : initialLanguagePreference,
  languagePreference: initialLanguagePreference,
  unit: "F",
  currentCity: null,
  weatherByCity: new Map(),
  weatherIcons: null,
  secretActive: false,
};

const t = (key, replacements) => translate(state.locale, key, replacements);
let dateFormatter;
let timeFormatter;
let numberFormatter;

function updateFormatters() {
  dateFormatter = new Intl.DateTimeFormat(state.locale);
  timeFormatter = new Intl.DateTimeFormat(state.locale, {
    hour: "numeric",
    minute: "2-digit",
  });
  numberFormatter = new Intl.NumberFormat(state.locale);
}

updateFormatters();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

class WeatherError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "WeatherError";
    this.kind = kind;
  }
}

function normalizeCity(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function temperature(value, unit = state.unit) {
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue)
    ? numberFormatter.format(numericValue)
    : value;
  return `${displayValue} °${unit}`;
}

function weatherValue(day, field) {
  return day[`${field}${state.unit}`];
}

function forecastDate(index) {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return dateFormatter.format(date);
}

function applyStaticTranslations() {
  document.documentElement.lang = state.locale;
  document.title = t("pageTitle");
  document.querySelector("#site-title").textContent = t("pageTitle");
  document.querySelector("#site-subtitle").textContent = t("subtitle");
  form.setAttribute("aria-label", t("searchLabel"));
  cityInput.placeholder = t("cityPlaceholder");
  cityInput.setAttribute("aria-label", t("cityLabel"));
  submitButton.textContent = t("getWeather");
  document.querySelector("#language-label").textContent = t("languageLabel");
  languageSelect.querySelector('option[value="auto"]').textContent = t("automaticLanguage");
  languageSelect.value = state.languagePreference;
  motionToggle.textContent = reducedMotion.matches
    ? t("motionReduced")
    : document.body.classList.contains("motion-paused")
      ? t("playMotion")
      : t("pauseMotion");
  if (cityInfo.dataset.state === "empty") {
    document.querySelector("#cityName").textContent = t("emptyPrompt");
  }
  document.querySelector("#historyHeading strong").textContent = t("previousSearches");
  emptyHistory.textContent = t("noPreviousSearches");
  document.querySelector("#app-copyright").textContent = t("appCopyright");
  document.querySelector("#language-support").textContent = t("supportedLanguages");
  const sunCredit = document.querySelector("#sun-credit");
  sunCredit.textContent = t("sunCredit");
  sunCredit.title = t("sunCreditTitle");
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  languageSelect.disabled = isLoading;
  submitButton.textContent = isLoading ? t("loading") : t("getWeather");
  form.setAttribute("aria-busy", String(isLoading));
}

function setMotionPaused(isPaused) {
  document.body.classList.toggle("motion-paused", isPaused);
  motionToggle.setAttribute("aria-pressed", String(isPaused));
  motionToggle.textContent = isPaused ? t("playMotion") : t("pauseMotion");
}

function applyMotionPreference(prefersReducedMotion) {
  if (prefersReducedMotion) {
    setMotionPaused(true);
    motionToggle.textContent = t("motionReduced");
    motionToggle.disabled = true;
    return;
  }

  motionToggle.disabled = false;
  setMotionPaused(false);
}

function showMessage(message, { isError = false, stateName = "status" } = {}) {
  const heading = document.createElement("h2");
  heading.id = "cityName";
  heading.textContent = message;
  cityInfo.replaceChildren(heading);
  cityInfo.dataset.state = stateName;
  cityInfo.classList.toggle("error-state", isError);
  cityInfo.setAttribute("role", isError ? "alert" : "status");
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

function localizedCondition(current) {
  return current[`lang_${state.locale}`]?.[0]?.value
    ?? current.lang_xx?.[0]?.value
    ?? current.weatherDesc?.[0]?.value
    ?? t("conditionsUnavailable");
}

function renderCurrentConditions(city, area, current, isSecret) {
  const heading = document.createElement("h2");
  heading.id = "cityName";
  const headingText = document.createElement("strong");
  headingText.textContent = isSecret ? "Love U" : city;
  heading.append(headingText);

  const countryName = area.country?.[0]?.value ?? "";
  const regionName = area.region?.[0]?.value ?? "";
  const areaName = displayAreaName(area.areaName?.[0]?.value ?? t("unknown"), countryName);
  const areaParagraph = createLabeledParagraph(t("area"), areaName);
  areaParagraph.className = "location-line area-line";
  const locationParagraphs = [areaParagraph];
  if (regionName) {
    const regionParagraph = createLabeledParagraph(t("region"), regionName);
    regionParagraph.className = "location-line region-line";
    locationParagraphs.push(regionParagraph);
  }
  const countryParagraph = createLabeledParagraph("", countryName);
  countryParagraph.className = "location-line country-line";
  locationParagraphs.push(countryParagraph);

  const conditionParagraph = document.createElement("p");
  conditionParagraph.className = "current-summary";
  const description = document.createElement("strong");
  description.className = "current-condition";
  description.style.margin = "0";
  description.textContent = localizedCondition(current);

  const temperatureGroup = document.createElement("span");
  temperatureGroup.className = "current-reading";
  const feelsLike = document.createElement("strong");
  feelsLike.className = "current-temperature";
  feelsLike.textContent = temperature(current[`FeelsLike${state.unit}`]);

  const timeGroup = document.createElement("span");
  timeGroup.className = "observed-reading";
  const observedAt = document.createElement("strong");
  observedAt.className = "observed-time";
  observedAt.textContent = timeFormatter.format(new Date());
  temperatureGroup.append(document.createTextNode(`${t("feelsLike")} `), feelsLike);
  timeGroup.append(document.createTextNode(`${t("observed")} `), observedAt);
  conditionParagraph.append(description, temperatureGroup, timeGroup);

  const unitButton = document.createElement("button");
  unitButton.type = "button";
  unitButton.className = "degreeCToF";
  unitButton.setAttribute("aria-pressed", String(state.unit === "C"));
  unitButton.textContent = t("changeUnit", { unit: state.unit === "F" ? "C" : "F" });

  cityInfo.replaceChildren(
    heading,
    ...locationParagraphs,
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
    averageLabel.textContent = t("averageTemperature");
    averages[index].append(averageLabel, document.createTextNode(` ${temperature(weatherValue(day, "avgtemp"))}`));

    maximums[index].replaceChildren();
    const maximumLabel = document.createElement("strong");
    maximumLabel.textContent = t("maximumTemperature");
    maximums[index].append(maximumLabel, document.createTextNode(` ${temperature(weatherValue(day, "maxtemp"))}`));

    minimums[index].replaceChildren();
    const minimumLabel = document.createElement("strong");
    minimumLabel.textContent = t("minimumTemperature");
    minimums[index].append(minimumLabel, document.createTextNode(` ${temperature(weatherValue(day, "mintemp"))}`));

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

function weatherTheme(description) {
  const condition = description.toLowerCase();
  if (condition.includes("thunder")) return { name: "storm", symbol: "⛈️" };
  if (condition.includes("snow") || condition.includes("blizzard")) {
    return { name: "snow", symbol: "❄️" };
  }
  if (condition.includes("ice") || condition.includes("freez") || condition.includes("sleet")) {
    return { name: "ice", symbol: "🧊" };
  }
  if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("shower")) {
    return { name: "rain", symbol: "🌧️" };
  }
  if (condition.includes("fog") || condition.includes("mist")) {
    return { name: "fog", symbol: "🌫️" };
  }
  if (condition.includes("partly cloudy")) {
    return { name: "partly-cloudy", symbol: "🌤️" };
  }
  if (condition.includes("cloud") || condition.includes("overcast")) {
    return { name: "cloud", symbol: "☁️" };
  }
  return { name: "clear", symbol: "☀️" };
}

function displayAreaName(value, country) {
  const isKnownDaKaoEncoding = value === "Ã\u0090A Kao" || value === "ÐA Kao";
  return country === "Vietnam" && isKnownDaKaoEncoding ? "Đa Kao" : value;
}

function parseCityInput(value) {
  const trimmedValue = value.trim();
  const isSecret = trimmedValue.toLowerCase() === SECRET_INPUT;
  return {
    city: isSecret ? "Ho Chi Minh City" : normalizeCity(trimmedValue),
    isSecret,
  };
}

function renderWeatherEmojis(description) {
  const theme = weatherTheme(description);
  document.body.dataset.weather = theme.name;
  cloudContainer.querySelectorAll(".weather-emoji").forEach((emoji) => emoji.remove());
  Array.from({ length: 5 }, () => theme.symbol).forEach((symbol, index) => {
    const emoji = document.createElement("span");
    emoji.className = "weather-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.style.setProperty("--weather-layer", String(index + 1));
    emoji.textContent = symbol;
    cloudContainer.append(emoji);
  });
}

async function updateWeatherBackground(weatherCode, description, isSecret) {
  renderWeatherEmojis(description);
  try {
    if (!state.weatherIcons) {
      const response = await fetch("icons.json");
      if (!response.ok) throw new Error(`Icon request failed with status ${response.status}.`);
      state.weatherIcons = await response.json();
    }

    clouds.forEach((cloud) => {
      cloud.querySelectorAll(".surprise-heart").forEach((heart) => heart.remove());
      const conditionArtwork = state.weatherIcons[weatherCode] ?? "url('assets/cloud.webp')";
      cloud.style.backgroundImage = conditionArtwork;
      if (isSecret) cloud.append(createHeart());
    });
  } catch (error) {
    console.error("Unable to update weather artwork.", error);
  }
}

function cacheWeather(city, weather) {
  const localizedWeather = state.weatherByCity.get(city) ?? new Map();
  localizedWeather.set(state.locale, weather);
  state.weatherByCity.set(city, localizedWeather);
}

function cachedWeather(city) {
  return state.weatherByCity.get(city)?.get(state.locale) ?? null;
}

function availableWeather(city) {
  const localizedWeather = state.weatherByCity.get(city);
  return localizedWeather?.values().next().value ?? null;
}

function renderHistory() {
  searchHistory.replaceChildren();
  emptyHistory.classList.toggle("hidden", state.weatherByCity.size > 0);
  historyPanel.classList.toggle("hidden", state.weatherByCity.size === 0);
  mainPage.classList.toggle("has-history", state.weatherByCity.size > 0);

  state.weatherByCity.forEach((localizedWeather, city) => {
    const item = document.createElement("li");
    item.className = "searchList";

    const link = document.createElement("a");
    link.className = "previousCity";
    link.href = "#";
    link.dataset.city = city;
    link.textContent = city;

    const currentTemperature = document.createElement("span");
    currentTemperature.className = "current-temp";
    const weather = localizedWeather.get(state.locale) ?? availableWeather(city);
    const feelsLike = weather.current_condition[0][`FeelsLike${state.unit}`];
    currentTemperature.textContent = `🌡️ ${temperature(feelsLike)}`;

    item.append(link, currentTemperature);
    searchHistory.append(item);
  });
}

function renderWeather(city, weather, { isSecret = false } = {}) {
  const area = weather.nearest_area?.[0];
  const current = weather.current_condition?.[0];
  const weatherDays = weather.weather;

  if (!area || !current || !Array.isArray(weatherDays) || weatherDays.length < 3) {
    throw new WeatherError("incomplete", "The weather service returned incomplete data.");
  }

  state.currentCity = city;
  state.secretActive = isSecret;
  cacheWeather(city, weather);
  cityInfo.dataset.state = "success";
  cityInfo.classList.remove("error-state");
  cityInfo.setAttribute("role", "status");
  renderCurrentConditions(city, area, current, isSecret);
  renderForecast(weatherDays);
  renderHistory();
  temperatures.style.display = "flex";
  void updateWeatherBackground(
    current.weatherCode,
    current.weatherDesc?.[0]?.value ?? "clear",
    isSecret,
  );
}

async function fetchWeather(city) {
  const response = await fetch(
    `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=${state.locale}`,
  );
  if (response.status === 404) {
    throw new WeatherError("not-found", `No weather was found for ${city}.`);
  }
  if (!response.ok) {
    throw new WeatherError("service", `Weather request failed with status ${response.status}.`);
  }
  return response.json();
}

function showWeatherError(error, city) {
  console.error(error);
  if (error instanceof WeatherError && error.kind === "not-found") {
    showMessage(t("notFound", { city }), {
      isError: true,
      stateName: "error",
    });
  } else if (error instanceof WeatherError && error.kind === "incomplete") {
    showMessage(t("incomplete", { city }), {
      isError: true,
      stateName: "error",
    });
  } else {
    showMessage(t("serviceUnavailable"), {
      isError: true,
      stateName: "error",
    });
  }
}

async function loadWeather(city, { isSecret = false, clearInput = false } = {}) {
  showMessage(t("loadingWeather", { city }), { stateName: "loading" });
  setLoading(true);

  try {
    const weather = await fetchWeather(city);
    renderWeather(city, weather, { isSecret });
    if (clearInput) cityInput.value = "";
  } catch (error) {
    showWeatherError(error, city);
  } finally {
    setLoading(false);
  }
}

function saveLanguagePreference(preference) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
  } catch (error) {
    console.warn("Unable to save the language preference.", error);
  }
}

async function applyLanguagePreference(preference) {
  const validPreference = preference === "auto" || SUPPORTED_LOCALES.includes(preference)
    ? preference
    : "auto";
  const nextLocale = validPreference === "auto" ? browserLocale() : validPreference;

  state.languagePreference = validPreference;
  saveLanguagePreference(validPreference);
  languageSelect.value = validPreference;

  if (nextLocale === state.locale) return;

  state.locale = nextLocale;
  updateFormatters();
  applyStaticTranslations();

  if (!state.currentCity) {
    showMessage(t("emptyPrompt"), { stateName: "empty" });
    return;
  }

  const weather = cachedWeather(state.currentCity);
  if (weather) {
    renderWeather(state.currentCity, weather, { isSecret: state.secretActive });
    return;
  }

  await loadWeather(state.currentCity, { isSecret: state.secretActive });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { city, isSecret } = parseCityInput(cityInput.value);

  if (!city) {
    showMessage(t("emptyPrompt"), { stateName: "empty" });
    cityInput.focus();
    return;
  }

  await loadWeather(city, { isSecret, clearInput: true });
});

cityInfo.addEventListener("click", (event) => {
  const button = event.target.closest("button.degreeCToF");
  if (!button || !state.currentCity) return;

  state.unit = state.unit === "F" ? "C" : "F";
  const weather = cachedWeather(state.currentCity);
  if (weather) renderWeather(state.currentCity, weather, { isSecret: state.secretActive });
});

searchHistory.addEventListener("click", async (event) => {
  const link = event.target.closest("a.previousCity[data-city]");
  if (!link) return;

  event.preventDefault();
  const weather = cachedWeather(link.dataset.city);
  if (weather) {
    renderWeather(link.dataset.city, weather, { isSecret: false });
  } else {
    await loadWeather(link.dataset.city, { isSecret: false });
  }
});

languageSelect.addEventListener("change", async () => {
  await applyLanguagePreference(languageSelect.value);
});

window.addEventListener("languagechange", async () => {
  if (state.languagePreference === "auto") {
    await applyLanguagePreference("auto");
  }
});

motionToggle.addEventListener("click", () => {
  setMotionPaused(!document.body.classList.contains("motion-paused"));
});

reducedMotion.addEventListener("change", (event) => applyMotionPreference(event.matches));
applyStaticTranslations();
applyMotionPreference(reducedMotion.matches);
