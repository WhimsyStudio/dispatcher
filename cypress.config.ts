import { defineConfig } from 'cypress';

export default defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/report',
    overwrite: true, 
    html: true, 
    json: true,
    reportFilename: "[name]_report.html",
    reportPageTitle: "Dispatcher Tests Report",   
  },
  e2e: {
    baseUrl: 'http://localhost:9000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
