import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import { findSimilarInDirectory } from '../src/node.js';

function parseArgs(argv) {
  const opts = {
    files: 1200,
    runs: 5,
    concurrency: 8,
    topK: 25,
    keepTemp: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--files') {
      opts.files = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--runs') {
      opts.runs = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--concurrency') {
      opts.concurrency = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--topK') {
      opts.topK = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === '--keep-temp') {
      opts.keepTemp = true;
      continue;
    }
  }

  if (!Number.isInteger(opts.files) || opts.files <= 0) {
    throw new Error('--files must be a positive integer');
  }
  if (!Number.isInteger(opts.runs) || opts.runs <= 0) {
    throw new Error('--runs must be a positive integer');
  }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency <= 0) {
    throw new Error('--concurrency must be a positive integer');
  }
  if (!Number.isInteger(opts.topK) || opts.topK <= 0) {
    throw new Error('--topK must be a positive integer');
  }

  return opts;
}

const TEMPLATES = [
  (idx) => `
function normalizeItems${idx}(items) {
  return items
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > ${(idx % 4) + 1})
    .sort();
}
`,
  (idx) => `
function sumArray${idx}(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i] * ${(idx % 5) + 1};
  }
  return total;
}
`,
  (idx) => `
export function groupByType${idx}(rows) {
  const out = new Map();
  for (const row of rows) {
    const key = row.type ?? 'unknown';
    const prev = out.get(key) || [];
    prev.push(row);
    out.set(key, prev);
  }
  return out;
}
`,
  (idx) => `
async function fetchJson${idx}(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('request failed');
  return res.json();
}
`,
  (idx) => `
class CacheStore${idx} {
  constructor(ttlMs = ${(idx % 7) + 1000}) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }
  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
  get(key) {
    const row = this.store.get(key);
    if (!row || row.expiresAt < Date.now()) return undefined;
    return row.value;
  }
}
`,
  (idx) => `
function flattenTree${idx}(node) {
  const out = [];
  const stack = [node];
  while (stack.length) {
    const curr = stack.pop();
    out.push(curr.value);
    if (curr.children) {
      for (let i = curr.children.length - 1; i >= 0; i--) {
        stack.push(curr.children[i]);
      }
    }
  }
  return out;
}
`
];

function buildSnippet(index) {
  const template = TEMPLATES[index % TEMPLATES.length];
  return template(index);
}

async function createCorpus(rootDir, fileCount) {
  const dirCount = 24;

  for (let d = 0; d < dirCount; d += 1) {
    await mkdir(path.join(rootDir, `group-${d % 8}`, `sub-${d}`), { recursive: true });
  }

  for (let i = 0; i < fileCount; i += 1) {
    const group = `group-${i % 8}`;
    const sub = `sub-${i % 24}`;
    const fullPath = path.join(rootDir, group, sub, `snippet-${i}.js`);
    const content = buildSnippet(i);
    await writeFile(fullPath, content, 'utf8');
  }
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.round((p / 100) * (sortedValues.length - 1))));
  return sortedValues[index];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'acf-bench-'));
  const corpusDir = path.join(tmpRoot, 'corpus');

  try {
    await mkdir(corpusDir, { recursive: true });
    await createCorpus(corpusDir, opts.files);

    const querySnippet = buildSnippet(0);

    await findSimilarInDirectory(querySnippet, corpusDir, {
      extensions: ['.js'],
      topK: opts.topK,
      concurrency: opts.concurrency,
      absolutePaths: false,
      minScore: 0
    });

    const runs = [];
    let lastOutput = null;

    for (let i = 0; i < opts.runs; i += 1) {
      const t0 = performance.now();
      const output = await findSimilarInDirectory(querySnippet, corpusDir, {
        extensions: ['.js'],
        topK: opts.topK,
        concurrency: opts.concurrency,
        absolutePaths: false,
        minScore: 0
      });
      const elapsedMs = performance.now() - t0;
      runs.push(elapsedMs);
      lastOutput = output;
    }

    const sorted = [...runs].sort((a, b) => a - b);
    const avgMs = runs.reduce((sum, val) => sum + val, 0) / runs.length;
    const p50Ms = percentile(sorted, 50);
    const p95Ms = percentile(sorted, 95);
    const throughputFilesPerSec = lastOutput.scannedFiles / (avgMs / 1000);

    const summary = {
      date: new Date().toISOString(),
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      cpu: os.cpus()?.[0]?.model || 'unknown',
      cpuCount: os.cpus()?.length || 0,
      corpusFiles: opts.files,
      scannedFilesPerRun: lastOutput.scannedFiles,
      topK: opts.topK,
      concurrency: opts.concurrency,
      runs: opts.runs,
      timingsMs: runs.map((v) => Number(v.toFixed(3))),
      avgMs: Number(avgMs.toFixed(3)),
      p50Ms: Number(p50Ms.toFixed(3)),
      p95Ms: Number(p95Ms.toFixed(3)),
      throughputFilesPerSec: Number(throughputFilesPerSec.toFixed(1)),
      topScore: Number((lastOutput.results?.[0]?.score ?? 0).toFixed(6)),
      topPath: lastOutput.results?.[0]?.path ?? null
    };

    console.log('any-code-fingerprint benchmark (findSimilarInDirectory)');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (!opts.keepTemp) {
      await rm(tmpRoot, { recursive: true, force: true });
    } else {
      console.log(`Temp benchmark data kept at: ${tmpRoot}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
