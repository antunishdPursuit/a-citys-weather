# A City's Weather

A responsive vanilla JavaScript application for searching current weather conditions and a three-day forecast.

## Live Application

[Open A City's Weather](https://antunishdpursuit.github.io/a-citys-weather/)

## Features

- Search for current weather by city
- View current conditions and a three-day forecast
- Switch between Fahrenheit and Celsius without another network request
- Reopen previous searches from the current browser session
- See condition-matched backgrounds, artwork, and animated weather layers
- Pause animation and use the interface with reduced-motion preferences
- Receive clear loading, empty, and error states
- Use the application across desktop and mobile layouts

## Built With

- HTML
- CSS
- Vanilla JavaScript
- [wttr.in](https://github.com/chubin/wttr.in) weather data
- Vite for local development and production builds
- Cypress for end-to-end testing
- GitHub Actions for automated build and test verification
- GitHub Pages for deployment

## Run Locally

Requirements:

- Node.js 24 or a compatible maintained release
- npm

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`.

## Testing

```bash
npm run build
npm test
```

`npm run build` creates the production build. `npm test` starts the local Vite server and runs the Cypress end-to-end suite using committed weather fixtures rather than the live API.

The repository's Quality workflow runs these checks automatically for pushes to `main` and pull requests.

## Technical Notes

- The browser application remains framework-free; Vite is development and build tooling rather than a runtime UI framework.
- Weather responses are cached by normalized city name for the current session.
- User-provided city names are rendered with safe DOM APIs rather than inserted as HTML.
- The interface supports keyboard focus, reduced-motion preferences, and responsive content flow.

## Limitations

- Results depend on wttr.in availability and location matching.
- The application provides daily summaries rather than hourly forecasts or severe-weather alerts.
- Previous searches reset when the page is refreshed.
- This is a portfolio application, not a safety-critical weather source.

## Credits

- Weather data: [wttr.in](https://github.com/chubin/wttr.in)
- Sun icon attribution: [Freepik on Flaticon](https://www.flaticon.com/free-icons/sun)
