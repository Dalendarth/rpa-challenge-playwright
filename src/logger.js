const fs = require('node:fs');
const path = require('node:path');

let logFile = null;

function init(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  logFile = path.join(outputDir, 'run.log');
  fs.writeFileSync(logFile, '');
}

function write(level, message) {
  const line = `[${new Date().toISOString()}] [${level.padEnd(5)}] ${message}`;
  (level === 'ERROR' ? console.error : console.log)(line);
  if (logFile) fs.appendFileSync(logFile, line + '\n');
}

module.exports = {
  init,
  info: (msg) => write('INFO', msg),
  warn: (msg) => write('WARN', msg),
  error: (msg) => write('ERROR', msg),
};
