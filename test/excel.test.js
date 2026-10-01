const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { readRecords, normalizeHeader, cellToString } = require('../src/excel');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpa-test-'));
const HEADERS = ['First Name', 'Last Name ', 'Company Name', 'Role in Company', 'Address', 'Email', 'Phone Number'];

async function createExcel(fileName, rows, headers = HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(headers);
  rows.forEach((r) => sheet.addRow(r));
  const filePath = path.join(tmpDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

test('normalizeHeader handles extra spaces and case', () => {
  assert.equal(normalizeHeader('  Last   Name '), 'last name');
});

test('cellToString converts numbers, hyperlinks and rich text', () => {
  assert.equal(cellToString(40716543298), '40716543298');
  assert.equal(cellToString({ text: 'a@b.com', hyperlink: 'mailto:a@b.com' }), 'a@b.com');
  assert.equal(cellToString({ richText: [{ text: 'Ac' }, { text: 'me' }] }), 'Acme');
  assert.equal(cellToString(null), '');
});

test('reads valid rows, handles header with trailing space and numeric phone', async () => {
  const file = await createExcel('valid.xlsx', [
    ['John', 'Smith', 'IT Solutions', 'Analyst', '98 North Road', 'jsmith@itsolutions.co.uk', 40716543298],
  ]);
  const { records, errors } = await readRecords(file);
  assert.equal(errors.length, 0);
  assert.equal(records.length, 1);
  assert.equal(records[0].lastName, 'Smith');
  assert.equal(records[0].phone, '40716543298');
});

test('ignores empty rows', async () => {
  const file = await createExcel('empty-rows.xlsx', [
    ['Jane', 'Dorsey', 'MediCare', 'Medical Engineer', '11 Crown Street', 'jdorsey@mc.com', 40791345621],
    [],
    [null, null, null, null, null, null, null],
  ]);
  const { records } = await readRecords(file);
  assert.equal(records.length, 1);
});

test('reports invalid email and empty fields with row number', async () => {
  const file = await createExcel('invalid.xlsx', [
    ['Albert', '', 'Waterfront', 'Accountant', '27 Cheshire Street', 'not-an-email', 40735416854],
  ]);
  const { errors } = await readRecords(file);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].row, 2);
  assert.ok(errors[0].problems.some((p) => p.includes('Last Name')));
  assert.ok(errors[0].problems.some((p) => p.includes('invalid format')));
});

test('throws a clear error when a column is missing', async () => {
  const file = await createExcel('missing-col.xlsx', [['A', 'B']], ['First Name', 'Last Name']);
  await assert.rejects(readRecords(file), /Missing columns in Excel: Company Name/);
});
