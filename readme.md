# A City's Weather

A responsive vanilla JavaScript application for searching current weather conditions and a three-day forecast. This was one of my earliest API projects and was modernized in 2026 to preserve the original learning while bringing its accessibility, testing, tooling, and documentation up to my current standard.

## What it demonstrates

- Fetching and validating data from the public [wttr.in](https://github.com/chubin/wttr.in) weather API
- Rendering current conditions and three forecast cards with safe DOM APIs
- Switching between Fahrenheit and Celsius without another network request
- Caching previous searches for the current browser session
- Explicit loading, empty, success, and error states
- A responsive interface with condition-matched backgrounds, animated weather layers, and local weather-code imagery
- Cypress end-to-end tests with deterministic API fixtures

## Live application

[Open A City's Weather](https://antunishdpursuit.github.io/project-weather-app/)

The deployment uses GitHub Pages. If the page still shows an older version immediately after a release, allow the Pages workflow to finish and refresh.

## Run locally

Requirements:

- Node.js 24 or a compatible maintained release
- npm

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`.

## Verify the project

```bash
npm run build
npm test
```

`npm test` starts the Vite development server and runs the Cypress suite. The tests intercept weather requests with committed fixtures, so they do not depend on the live API.

## Architecture

- `index.html` defines the semantic search, weather, history, and footer structure.
- `main.js` owns application state, weather requests, rendering, unit conversion, and the session search history.
- `style.css` defines the responsive design system and animated weather layers.
- `icons.json` maps weather codes to the original local background artwork.
- `cypress/e2e/weather.cy.js` covers search states, condition themes, unit switching, cached history, request failures, motion controls, and desktop/mobile layout geometry.
- `.github/workflows/quality.yml` runs install, build, and end-to-end verification on pushes and pull requests.

## Design decisions

- The project remains framework-free. A framework rewrite would hide the original DOM and API-learning evidence without solving a product need.
- The interface retains the project's original sky-blue character while using a documented palette, clearer hierarchy, and responsive content flow.
- Search history is intentionally session-only; the app does not collect accounts or personal data.
- Weather responses are cached by normalized city name so toggling units and reopening a previous result do not make unnecessary API calls.
- User-provided city names are rendered with `textContent`, not injected as HTML.
- The animated sky uses six matching artwork layers and one repeated emoji for the returned condition. Users can pause the motion, and the app honors the system reduced-motion preference.

## Known limitations

- Results depend on the availability and location matching of wttr.in.
- The app displays three daily summaries rather than hourly or severe-weather alerts.
- Search history resets when the page is refreshed.
- The project is a portfolio learning application, not a safety-critical weather source.

## Modernization history

The 2026 update:

- replaced the obsolete `live-server` and Cypress 9 setup with Vite and a current Cypress suite;
- removed tests for UI and features that no longer existed;
- fixed malformed degree symbols and emoji encoding;
- removed duplicated rendering paths and unsafe user-input HTML;
- retained the original animated weather artwork and footer while improving semantic structure and accessibility;
- added tests that protect weather states, artwork coherence, and responsive layout geometry;
- repaired the phone layout and removed fixed-footer overlap across viewports;
- improved first-use guidance, action hierarchy, text contrast, and current-condition hierarchy within the original palette;
- synchronized the background, artwork, and emoji layers with each returned condition;
- added pause/resume and reduced-motion behavior;
- added a reproducible production build and GitHub Actions quality workflow.

## Original learning context

The original 2023 project practiced asynchronous API calls, DOM manipulation, conditional rendering, temperature conversion, search history, CSS animation, and Cypress. Its commit history remains intact so the progression from the early implementation to the current version is visible.
