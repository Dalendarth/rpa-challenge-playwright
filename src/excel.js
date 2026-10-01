const ExcelJS = require('exceljs');
const { FIELDS } = require('./fields');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "  Last Name " -> "last name" (the original file has a trailing space in a header) */
function normalizeHeader(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Converts any ExcelJS cell value (number, hyperlink, rich text, date...) to a clean string */
function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    if (value.text !== undefined) return cellToString(value.text); // hyperlink
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text).join('').trim();
    if (value.result !== undefined) return cellToString(value.result); // formula
  }
  return String(value).trim();
}

/** Returns a list of problems found in one record (empty list = valid) */
function validateRecord(record) {
  const problems = [];
  for (const field of FIELDS) {
    if (!record[field.key]) problems.push(`"${field.header}" is empty`);
  }
  if (record.email && !EMAIL_REGEX.test(record.email)) {
    problems.push(`"Email" has an invalid format (${record.email})`);
  }
  return problems;
}

/**
 * Reads the challenge Excel file and returns:
 *  - records: rows converted to objects ({ firstName, lastName, ... })
 *  - errors:  validation problems, with the Excel row number
 */
async function readRecords(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The Excel file has no worksheets');

  // Map each expected column to its position in the sheet
  const headerRow = sheet.getRow(1);
  const columnIndex = {};
  headerRow.eachCell((cell, col) => {
    const field = FIELDS.find((f) => normalizeHeader(f.header) === normalizeHeader(cell.value));
    if (field) columnIndex[field.key] = col;
  });

  const missing = FIELDS.filter((f) => !columnIndex[f.key]).map((f) => f.header);
  if (missing.length) throw new Error(`Missing columns in Excel: ${missing.join(', ')}`);

  const records = [];
  const errors = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const record = {};
    for (const field of FIELDS) {
      record[field.key] = cellToString(row.getCell(columnIndex[field.key]).value);
    }
    // Ignore completely empty rows
    if (FIELDS.every((f) => !record[f.key])) continue;

    const problems = validateRecord(record);
    if (problems.length) errors.push({ row: rowNumber, problems });
    records.push(record);
  }

  return { records, errors };
}

module.exports = { readRecords, validateRecord, normalizeHeader, cellToString };
