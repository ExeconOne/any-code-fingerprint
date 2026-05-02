# any-code-fingerprint

Deterministic source code fingerprinting, snippet hashing, and code (any programming language) similarity detection for Node.js and browsers

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
- `dist/cli.mjs`
- `dist/cli.cjs`
- `dist/index.browser.js`

## CLI

### macOS — Homebrew (Apple Silicon)

```bash
brew tap ExeconOne/acf
brew install acf
```

### Linux — apt (Ubuntu 20.04+ / Debian 12+)

```bash
curl -fsSL https://ExeconOne.github.io/any-code-fingerprint/gpg.key \
  | sudo gpg --dearmor -o /usr/share/keyrings/execonone-acf.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/execonone-acf.gpg] \
https://ExeconOne.github.io/any-code-fingerprint stable main" \
  | sudo tee /etc/apt/sources.list.d/acf.list

sudo apt-get update
sudo apt-get install acf
```

### Manual install (tarball)

**macOS (Apple Silicon)**

```bash
VERSION=0.1.14
curl -LO "https://github.com/ExeconOne/any-code-fingerprint/releases/download/v${VERSION}/acf-macos-arm64.tar.gz"
shasum -a 256 -c acf-macos-arm64.tar.gz.sha256
tar -xzf acf-macos-arm64.tar.gz
chmod +x acf-macos-arm64
sudo mv acf-macos-arm64 /usr/local/bin/acf
```

**Linux (x64)**

```bash
VERSION=0.1.14
curl -LO "https://github.com/ExeconOne/any-code-fingerprint/releases/download/v${VERSION}/acf-linux-x64.tar.gz"
shasum -a 256 -c acf-linux-x64.tar.gz.sha256
tar -xzf acf-linux-x64.tar.gz
chmod +x acf-linux-x64
sudo mv acf-linux-x64 /usr/local/bin/acf
```

### Build binary locally

```bash
# on macOS
npm run build-mac-cli

# on Linux
npm run build-linux-cli
```

Artifacts are generated under `artifacts/cli/v<version>/`.

### Commands

```
acf compare <fileA> <fileB> [options]
acf find <queryFile> <rootDir> [options]
acf fingerprint <file> [options]
```

#### `find` — search for similar files

Default output is one path per line, sorted by similarity (most similar first):

```bash
acf find snippet.js ./src
```

```
/home/user/project/src/utils.js
/home/user/project/src/helpers/string.js
/home/user/project/src/lib/parse.js
```

Pipe-friendly — works with standard Unix tools:

```bash
acf find snippet.js ./src | head -5
acf find snippet.js ./src | xargs grep "TODO"
acf find snippet.js ./src --min-score 0.8 | wc -l
```

Use `--format table` for the full scored breakdown:

```bash
acf find snippet.js ./src --format table
```

```
scanned: 142  matched: 38  errors: 0

rank  score      sim_global  sim_local   sim_order   sim_type    sim_bigram  path
----  ---------  ----------  ----------  ----------  ----------  ----------  ----
1     0.921034   0.998122    0.991450    0.843200    0.812300    0.764100    /home/user/project/src/utils.js
2     0.876541   0.987300    0.954200    0.801100    0.776400    0.712300    /home/user/project/src/helpers/string.js
```

Score components:

| column | description |
|---|---|
| `score` | weighted average of all components |
| `sim_global` | global image similarity (whole-file token encoding) |
| `sim_local` | local window alignment similarity |
| `sim_order` | token type ordering pattern similarity |
| `sim_type` | token type distribution similarity |
| `sim_bigram` | token bigram distribution similarity |

Available options:

```
--top-k <n>              return at most N results (default: 20)
--min-score <n>          minimum score threshold 0..1 (default: 0)
--ext .js,.ts,.py        file extensions to scan
--exclude dir1,dir2      directory names to skip
--max-file-size <bytes>  skip files larger than this (default: 512000)
--concurrency <n>        parallel workers (default: 8)
--relative               output relative paths instead of absolute
--format paths|table|json  output format (default: paths)
--weights g,l,o,t[,b]   custom metric weights (default: 0.4,0.3,0.15,0.15,0.2)
```

#### `compare` — compare two files directly

```bash
acf compare fileA.js fileB.js --format table
```

```
metric               value
-------------------  ----------
score                0.876541
sim_global           0.987300
sim_local_alignment  0.954200
sim_order            0.801100
sim_type             0.776400
sim_bigram           0.712300
```

#### `fingerprint` — inspect a file's fingerprint

```bash
acf fingerprint file.js
```

```
fingerprint summary
-------------------
tokens:        42
numWindows:    4
global shape:  64x64x3
order bins:    16
type bins:     16
bigram bins:   64
```


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
