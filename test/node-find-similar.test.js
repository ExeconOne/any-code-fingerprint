import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';

import { findSimilarInDirectory } from '../src/node.js';

test('findSimilarInDirectory scans recursively and ranks matches', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'acf-test-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const query = `
  function sum(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) total += items[i];
    return total;
  }
  `;

  await mkdir(path.join(tempRoot, 'nested'), { recursive: true });
  await mkdir(path.join(tempRoot, 'node_modules'), { recursive: true });

  await writeFile(path.join(tempRoot, 'a.js'), query, 'utf8');
  await writeFile(
    path.join(tempRoot, 'nested', 'b.js'),
    'function add(values){ let acc=0; for(let j=0;j<values.length;j++) acc += values[j]; return acc; }',
    'utf8'
  );
  await writeFile(path.join(tempRoot, 'c.js'), 'class HttpClient { get() { return fetch("/"); } }', 'utf8');
  await writeFile(path.join(tempRoot, 'node_modules', 'ignored.js'), query, 'utf8');

  const out = await findSimilarInDirectory(query, tempRoot, {
    topK: 10,
    minScore: 0,
    extensions: ['.js'],
    absolutePaths: false
  });

  assert.equal(out.scannedFiles, 3);
  assert.equal(out.results.length, 3);
  assert.equal(out.errors.length, 0);
  assert.ok(out.results[0].score >= out.results[1].score);
  assert.equal(out.results[0].path, 'a.js');
  assert.ok(out.results[0].score > 0.9999);
  assert.ok(out.results.some((entry) => entry.path === path.join('nested', 'b.js')));
});

test('findSimilarInDirectory supports includeFingerprints and minScore', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'acf-test-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const query = 'function normalize(v){ return v.trim().toLowerCase(); }';

  await writeFile(path.join(tempRoot, 'same.js'), query, 'utf8');
  await writeFile(path.join(tempRoot, 'other.js'), 'class Box { size() { return 42; } }', 'utf8');

  const out = await findSimilarInDirectory(query, tempRoot, {
    minScore: 0.99,
    topK: 5,
    extensions: ['.js'],
    absolutePaths: false,
    includeFingerprints: true
  });

  assert.ok(out.queryFingerprint);
  assert.equal(out.results.length, 1);
  assert.equal(out.results[0].path, 'same.js');
  assert.ok(out.results[0].fingerprint);
  assert.ok(out.results[0].score > 0.9999);
});
