const logger = require('./logger');

/**
 * Runs an async function and retries it when it fails.
 * Useful for flaky steps such as page loads or slow UI rendering.
 */
async function withRetry(fn, { retries = 2, label = 'step', delayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt <= retries) {
        logger.warn(`${label} failed (attempt ${attempt}/${retries + 1}): ${err.message}. Retrying...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw new Error(`${label} failed after ${retries + 1} attempts: ${lastError.message}`);
}

module.exports = { withRetry };
