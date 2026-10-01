const path = require('node:path');

const args = process.argv.slice(2);

/**
 * Central configuration. Everything can be changed with environment
 * variables, so the bot can run locally, in Docker or in a CI pipeline
 * without code changes.
 */
module.exports = {
  url: process.env.CHALLENGE_URL || 'https://rpachallenge.com/',
  headless: args.includes('--headed') ? false : process.env.HEADLESS !== 'false',
  slowMo: Number(process.env.SLOW_MO || 0),
  // Optional: use a local Excel file instead of downloading it from the site
  excelPath: process.env.EXCEL_PATH || null,
  outputDir: path.resolve(process.env.OUTPUT_DIR || path.join(__dirname, '..', 'output')),
  // Optional: path to a custom Chromium/Chrome executable
  browserPath: process.env.BROWSER_PATH || undefined,
  maxRetries: Number(process.env.MAX_RETRIES || 2),
  timeoutMs: Number(process.env.TIMEOUT_MS || 15000),
};
