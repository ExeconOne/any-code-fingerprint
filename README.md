# any-code-fingerprint

Deterministic source-code fingerprinting for snippet similarity.

The package supports:
- Node.js (ESM and CommonJS)
- Browser usage (IIFE bundle)
- Pure JavaScript runtime (no native addons)
- Zero external runtime dependencies
- Language-agnostic usage across programming languages and source code formats (any code that can be read as text)

## Research Note

This library is based on research work prepared for a publication currently under review for **SEAA 2026**.

Conference CFP link:
- https://easychair.org/cfp/SEAA2026

## Installation

```bash
npm install any-code-fingerprint
```

## Public API

Main exports:
- `snippetFingerprint` (alias to `snippetFingerprint`)
- `compareFingerprints` (alias to `compareSnippetFingerprints`)

Helpers:
- `compareCodeSnippets(codeA, codeB, options?)`
- `findSimilarInDirectory(queryCode, rootDir, options?)` (Node-only, exported from `any-code-fingerprint/node`)

## Usage (Node.js ESM)

```js
import {
  snippetFingerprint,
  compareFingerprints,
  compareCodeSnippets
} from 'any-code-fingerprint';

const codeA = 'function sum(a,b){ return a+b; }';
const codeB = 'function add(x,y){ return x+y; }';

const fpA = snippetFingerprint(codeA);
const fpB = snippetFingerprint(codeB);
const similarity = compareFingerprints(fpA, fpB);

console.log(similarity.score);

const direct = compareCodeSnippets(codeA, codeB);
console.log(direct);
```

## Usage (Node.js CommonJS)

```js
const {
  snippetFingerprint,
  compareFingerprints,
  compareCodeSnippets
} = require('any-code-fingerprint');

const result = compareCodeSnippets(
  'for(let i=0;i<10;i++){x+=i}',
  'for(let j=0;j<10;j++){sum+=j}'
);

console.log(result.score);
```

## Directory Search (Node-only)

```js
import { findSimilarInDirectory } from 'any-code-fingerprint/node';

const query = `
function normalize(items) {
  return items.map((x) => x.trim().toLowerCase());
}
`;

const output = await findSimilarInDirectory(query, './src', {
  topK: 20,
  minScore: 0.5,
  extensions: ['.js', '.ts'],
  excludeDirs: ['node_modules', 'dist', '.git'],
  maxFileSizeBytes: 300000,
  concurrency: 8,
  absolutePaths: false
});

console.log(output.results.slice(0, 5));
```

## Browser Usage

Recommended with jsDelivr:
- ESM import: `https://cdn.jsdelivr.net/npm/any-code-fingerprint@0.1.1/dist/index.mjs`
- Global build: `https://cdn.jsdelivr.net/npm/any-code-fingerprint@0.1.1/dist/index.browser.js`


### ES module

```html
<script type="module">
  import { compareCodeSnippets } from 'https://cdn.jsdelivr.net/npm/any-code-fingerprint@0.1.1/dist/index.mjs';
  const result = compareCodeSnippets('const a=1', 'let b=1');
  console.log(result.score);
</script>
```

### Global IIFE bundle

```html
<script src="https://cdn.jsdelivr.net/npm/any-code-fingerprint@0.1.1/dist/index.browser.js"></script>
<script>
  const result = AnyCodeFingerprint.compareCodeSnippets('const a=1', 'let b=1');
  console.log(result.score);
</script>
```

## Helper Options

`compareCodeSnippets`:

```js
compareCodeSnippets(codeA, codeB, {
  fingerprintOptions: { numWindows: 4, normalize: true, filterStops: true },
  scoreOptions: { wGlobal: 0.4, wLocal: 0.3, wOrder: 0.15, wType: 0.15 },
  includeFingerprints: false
});
```

`findSimilarInDirectory`:

```js
findSimilarInDirectory(queryCode, rootDir, {
  topK: 50,
  minScore: 0,
  extensions: ['.js', '.ts', '.py'],
  excludeDirs: ['node_modules', '.git', 'dist'],
  maxFileSizeBytes: 512000,
  concurrency: 8,
  absolutePaths: true,
  fingerprintOptions: { numWindows: 4, normalize: true, filterStops: true },
  scoreOptions: { wGlobal: 0.4, wLocal: 0.3, wOrder: 0.15, wType: 0.15 },
  includeFingerprints: false
});
```

## Build and Test

```bash
npm install
npm run build
npm test
```

Build outputs:
- `dist/index.mjs`
- `dist/index.cjs`
- `dist/node.mjs`
- `dist/node.cjs`
- `dist/index.browser.js`

## Quick Performance Benchmark

A local benchmark script is included to measure directory search speed:

```bash
npm run benchmark
```

Optional parameters:

```bash
npm run benchmark -- --files 2000 --runs 7 --concurrency 12 --topK 30
```

What it does:
- generates a synthetic recursive corpus of JavaScript snippets,
- performs one warm-up pass,
- runs `findSimilarInDirectory` multiple times,
- reports latency and throughput.

## Reference Benchmark Results

Reference run date: **April 26, 2026**

Environment:
- Node.js: `v20.19.0`
- Platform: `darwin arm64`
- CPU: `Apple M3 Max` (16 cores)

Benchmark config:
- corpus size: `1200` files
- runs: `5`
- concurrency: `8`
- topK: `25`

Measured results:
- average latency: `2854.471 ms`
- p50 latency: `2854.459 ms`
- p95 latency: `2856.994 ms`
- throughput: `420.4 files/sec`
- top hit score: `1.0`

Notes:
- these values are reference numbers from this specific machine and dataset,
- real-world results depend on file sizes, language mix, storage speed, and CPU.

## Notes

- The comparison API is deterministic for identical inputs.
- `findSimilarInDirectory` depends on `fs`, so it is not available in browsers.
