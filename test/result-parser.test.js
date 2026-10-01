const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseResultMessage } = require('../src/result-parser');

test('parses a successful result message', () => {
  const r = parseResultMessage('Congratulations!\n Your success rate is 100% ( 70 out of 70 fields) in 48 milliseconds');
  assert.equal(r.successRate, 100);
  assert.equal(r.correctFields, 70);
  assert.equal(r.totalFields, 70);
  assert.equal(r.timeMs, 48);
});

test('parses a partial result', () => {
  const r = parseResultMessage('Your success rate is 85.71% ( 60 out of 70 fields) in 1203 milliseconds');
  assert.equal(r.successRate, 85.71);
  assert.equal(r.correctFields, 60);
});

test('returns nulls for unexpected text instead of crashing', () => {
  const r = parseResultMessage('Something else');
  assert.equal(r.successRate, null);
  assert.equal(r.timeMs, null);
});
