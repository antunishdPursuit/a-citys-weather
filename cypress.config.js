const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,
  video: false,
  e2e: {
    baseUrl: "http://127.0.0.1:5173",
    supportFile: "cypress/support/e2e.js",
  },
});
