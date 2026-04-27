import test from 'node:test';
import assert from 'node:assert/strict';

import {
  snippetFingerprint,
  compareFingerprints,
  compareSnippetFingerprints,
  compareCodeSnippets,
  normalizeCode,
  classifyToken,
  TOKEN_TYPE
} from '../src/index.js';

test('compareFingerprints is an alias of compareSnippetFingerprints', () => {
  assert.equal(compareFingerprints, compareSnippetFingerprints);
});

test('snippetFingerprint returns expected structure', () => {
  const code = `
  function sum(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) total += items[i];
    return total;
  }
  `;

  const fp = snippetFingerprint(code);

  assert.equal(fp.global.width, 64);
  assert.equal(fp.global.height, 64);
  assert.equal(fp.global.channels, 3);
  assert.equal(fp.global.data.length, 64 * 64 * 3);
  assert.equal(fp.windows.length, 4);
  assert.equal(fp.orderSignature.length, 16);
  assert.equal(fp.typeProfile.length, 16);
  assert.equal(fp.bigramProfile.length, 64);
  assert.ok(fp.tokens.length > 0);
});

test('compareCodeSnippets matches manual fingerprint compare', () => {
  const codeA = 'function normalize(v){ return v.trim().toLowerCase(); }';
  const codeB = 'function clean(x){ return x.trim().toLowerCase(); }';

  const manual = compareFingerprints(
    snippetFingerprint(codeA),
    snippetFingerprint(codeB)
  );
  const direct = compareCodeSnippets(codeA, codeB);

  assert.deepEqual(direct, manual);
});

test('compareCodeSnippets can include fingerprint objects', () => {
  const result = compareCodeSnippets(
    'const x = 1; return x;',
    'let y = 1; return y;',
    { includeFingerprints: true }
  );

  assert.ok(result.fingerprintA);
  assert.ok(result.fingerprintB);
  assert.equal(result.fingerprintA.global.width, 64);
  assert.equal(typeof result.score, 'number');
});

test('normalizeCode and classifyToken expose expected behavior', () => {
  const normalized = normalizeCode('const x = "hello" + 42');

  assert.match(normalized, /STR/);
  assert.match(normalized, /NUM/);
  assert.equal(classifyToken('num'), TOKEN_TYPE.NUM);
  assert.equal(classifyToken('str'), TOKEN_TYPE.STR);
  assert.equal(classifyToken('function'), TOKEN_TYPE.KEYWORD);
});
