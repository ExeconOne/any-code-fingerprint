import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const cliPath = '/Users/grulka/Documents/Projekty/gitspace/private/any-code-fingerprint/src/cli.js';

function runCli(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('acf compare fileA fileB returns JSON with score', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'acf-cli-test-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const a = path.join(tempRoot, 'a.js');
  const b = path.join(tempRoot, 'b.js');

  await writeFile(a, 'function sum(x){ return x + 1; }', 'utf8');
  await writeFile(b, 'function add(y){ return y + 1; }', 'utf8');

  const result = await runCli(['compare', a, b], tempRoot);

  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout.trim());
  assert.equal(typeof payload.score, 'number');
  assert.equal(typeof payload.sim_global, 'number');
});

test('acf find snippet.js ./src --top-k 1 works', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'acf-cli-test-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  await mkdir(path.join(tempRoot, 'src', 'nested'), { recursive: true });

  const query = path.join(tempRoot, 'snippet.js');
  const file1 = path.join(tempRoot, 'src', 'one.js');
  const file2 = path.join(tempRoot, 'src', 'nested', 'two.js');

  const code = 'function normalize(v){ return v.trim().toLowerCase(); }';

  await writeFile(query, code, 'utf8');
  await writeFile(file1, code, 'utf8');
  await writeFile(file2, 'class C { get() { return 42; } }', 'utf8');

  const result = await runCli(['find', query, path.join(tempRoot, 'src'), '--top-k', '1', '--format', 'json'], tempRoot);

  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout.trim());
  assert.equal(payload.results.length, 1);
  assert.equal(typeof payload.results[0].score, 'number');
});

test('acf fingerprint file.js prints summary', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'acf-cli-test-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const file = path.join(tempRoot, 'file.js');
  await writeFile(file, 'const x = 1; function f(){ return x; }', 'utf8');

  const result = await runCli(['fingerprint', file], tempRoot);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /fingerprint summary/);
  assert.match(result.stdout, /tokens:/);
});
