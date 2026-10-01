/**
 * End-to-end test: runs the real bot against a local copy of the challenge
 * (test/mock-site), so the full flow can be tested offline and in CI.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFile } = require('node:child_process');
const ExcelJS = require('exceljs');

const SITE_DIR = path.join(__dirname, 'mock-site');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpa-e2e-'));
let server;
let baseUrl;

const RECORDS = [
  ['John', 'Smith', 'IT Solutions', 'Analyst', '98 North Road', 'jsmith@itsolutions.co.uk', '40716543298'],
  ['Jane', 'Dorsey', 'MediCare', 'Medical Engineer', '11 Crown Street', 'jdorsey@mc.com', '40791345621'],
  ['Albert', 'Kipling', 'Waterfront', 'Accountant', '22 Guild Street', 'kipling@waterfront.com', '40735416854'],
];

before(async () => {
  // Build the Excel file the mock site will serve (note the trailing space, like the real file)
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(['First Name', 'Last Name ', 'Company Name', 'Role in Company', 'Address', 'Email', 'Phone Number']);
  RECORDS.forEach((r) => sheet.addRow([...r.slice(0, 6), Number(r[6])]));
  const xlsx = await workbook.xlsx.writeBuffer();
  const keys = ['firstName', 'lastName', 'companyName', 'role', 'address', 'email', 'phone'];
  const json = JSON.stringify(RECORDS.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]]))));

  server = http.createServer((req, res) => {
    if (req.url.startsWith('/challenge.xlsx')) {
      res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      return res.end(xlsx);
    }
    if (req.url.startsWith('/data.json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(json);
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(SITE_DIR, 'index.html')));
  });
  await new Promise((r) => server.listen(0, r));
  baseUrl = `http://127.0.0.1:${server.address().port}/`;
});

after(() => {
  server?.close();
  fs.rmSync(workDir, { recursive: true, force: true });
});

test('bot completes the challenge with 100% success', { timeout: 60000 }, async () => {
  const env = { ...process.env, CHALLENGE_URL: baseUrl, OUTPUT_DIR: workDir, HEADLESS: 'true' };
  await new Promise((resolve, reject) => {
    execFile('node', [path.join(__dirname, '..', 'src', 'index.js')], { env }, (err, stdout, stderr) =>
      err ? reject(new Error(stdout + stderr)) : resolve());
  });

  const report = JSON.parse(fs.readFileSync(path.join(workDir, 'report.json'), 'utf8'));
  assert.equal(report.status, 'success');
  assert.equal(report.successRate, 100);
  assert.equal(report.correctFields, RECORDS.length * 7);
  assert.ok(fs.existsSync(path.join(workDir, 'result.png')), 'result screenshot should exist');
});
