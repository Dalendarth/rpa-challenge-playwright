/**
 * Parses the final message from rpachallenge.com, for example:
 * "Congratulations! Your success rate is 100% ( 70 out of 70 fields) in 48 milliseconds"
 */
function parseResultMessage(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const rate = clean.match(/(\d+(?:\.\d+)?)\s*%/);
  const fields = clean.match(/(\d+)\s*out of\s*(\d+)/i);
  const time = clean.match(/(\d+(?:\.\d+)?)\s*milliseconds/i);

  return {
    message: clean,
    successRate: rate ? Number(rate[1]) : null,
    correctFields: fields ? Number(fields[1]) : null,
    totalFields: fields ? Number(fields[2]) : null,
    timeMs: time ? Number(time[1]) : null,
  };
}

module.exports = { parseResultMessage };
