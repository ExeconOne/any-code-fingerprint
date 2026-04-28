import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  compareCodeSnippets,
  findSimilarInDirectory,
  snippetFingerprint
} from './node.js';

const EXIT_INVALID_ARGS = 2;
const EXIT_RUNTIME_ERROR = 1;

function parseCsv(value) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseNumber(value, name) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid numeric value for ${name}: ${value}`);
  }
  return num;
}

function parseIntStrict(value, name) {
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new Error(`Invalid integer value for ${name}: ${value}`);
  }
  return num;
}

function parseWeights(value) {
  const weights = parseCsv(value).map((item) => parseNumber(item, '--weights'));
  if (weights.length !== 4) {
    throw new Error('--weights must have exactly 4 comma-separated values');
  }
  return {
    wGlobal: weights[0],
    wLocal: weights[1],
    wOrder: weights[2],
    wType: weights[3]
  };
}

function formatNumber(value) {
  return Number(value).toFixed(6);
}

function printJson(value, pretty) {
  const spacing = pretty ? 2 : 0;
  console.log(JSON.stringify(value, null, spacing));
}

function printCompareTable(result) {
  console.log('metric               value');
  console.log('-------------------  ----------');
  console.log(`score                ${formatNumber(result.score)}`);
  console.log(`sim_global           ${formatNumber(result.sim_global)}`);
  console.log(`sim_local_alignment  ${formatNumber(result.sim_local_alignment)}`);
  console.log(`sim_order            ${formatNumber(result.sim_order)}`);
  console.log(`sim_type             ${formatNumber(result.sim_type)}`);
}

function printFindTable(payload) {
  console.log(`scanned: ${payload.scannedFiles}  matched: ${payload.matchedFiles}  errors: ${payload.errors.length}`);
  console.log('');
  console.log('rank  score      sim_global  sim_local   sim_order   sim_type    path');
  console.log('----  ---------  ----------  ----------  ----------  ----------  ----');

  payload.results.forEach((row, index) => {
    const rank = String(index + 1).padEnd(4, ' ');
    const score = formatNumber(row.score).padEnd(9, ' ');
    const sg = formatNumber(row.sim_global).padEnd(10, ' ');
    const sl = formatNumber(row.sim_local_alignment).padEnd(10, ' ');
    const so = formatNumber(row.sim_order).padEnd(10, ' ');
    const st = formatNumber(row.sim_type).padEnd(10, ' ');
    console.log(`${rank}  ${score}  ${sg}  ${sl}  ${so}  ${st}  ${row.path}`);
  });

  if (payload.errors.length > 0) {
    console.error('');
    console.error('errors:');
    payload.errors.slice(0, 10).forEach((item) => {
      console.error(`- ${item.path}: ${item.message}`);
    });
    if (payload.errors.length > 10) {
      console.error(`- ... and ${payload.errors.length - 10} more`);
    }
  }
}

function printFingerprintSummary(payload) {
  console.log('fingerprint summary');
  console.log('-------------------');
  console.log(`tokens:        ${payload.tokensCount}`);
  console.log(`numWindows:    ${payload.numWindows}`);
  console.log(`global shape:  ${payload.global.width}x${payload.global.height}x${payload.global.channels}`);
  console.log(`order bins:    ${payload.orderSignatureLength}`);
  console.log(`type bins:     ${payload.typeProfileLength}`);
  console.log(`bigram bins:   ${payload.bigramProfileLength}`);
}

function readVersion() {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = path.dirname(currentFile);
    const packageJsonPath = path.resolve(currentDir, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function readCodeFile(filePath) {
  const resolved = path.resolve(filePath);
  const fileStat = await stat(resolved);

  if (!fileStat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const content = await readFile(resolved, 'utf8');
  return { resolved, content };
}

function parseCommandArgs(args, valueOptions, flagOptions) {
  const positionals = [];
  const options = new Map();
  const flags = new Set();

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    if (valueOptions.has(token)) {
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for option ${token}`);
      }
      options.set(token, value);
      i += 1;
      continue;
    }

    if (flagOptions.has(token)) {
      flags.add(token);
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return { positionals, options, flags };
}

function buildFingerprintOptions(options, flags) {
  const fingerprintOptions = {};

  if (options.has('--num-windows')) {
    fingerprintOptions.numWindows = parseIntStrict(options.get('--num-windows'), '--num-windows');
  }

  if (flags.has('--normalize')) fingerprintOptions.normalize = true;
  if (flags.has('--no-normalize')) fingerprintOptions.normalize = false;
  if (flags.has('--filter-stops')) fingerprintOptions.filterStops = true;
  if (flags.has('--no-filter-stops')) fingerprintOptions.filterStops = false;

  return fingerprintOptions;
}

function helpText() {
  return `acf - any-code-fingerprint CLI

Usage:
  acf compare <fileA> <fileB> [options]
  acf find <queryFile> <rootDir> [options]
  acf fingerprint <file> [options]

Commands:
  compare      Compare two source files
  find         Find snippets similar to queryFile in rootDir recursively
  fingerprint  Compute fingerprint of one source file

Common options:
  --num-windows <n>
  --normalize | --no-normalize
  --filter-stops | --no-filter-stops
  --pretty

compare options:
  --format json|table             (default: json)
  --weights g,l,o,t               (example: 0.4,0.3,0.15,0.15)

find options:
  --top-k <n>                     (default: 20)
  --min-score <n>                 (default: 0)
  --ext .js,.ts,.py
  --exclude node_modules,.git,dist
  --max-file-size <bytes>         (default: 512000)
  --concurrency <n>               (default: 8)
  --relative | --absolute         (default: absolute)
  --format json|table             (default: table)

fingerprint options:
  --format summary|json           (default: summary)
  --include-vectors               (json only)

Other:
  --help, -h
  --version, -v
`;
}

async function runCompare(args) {
  const valueOptions = new Set(['--format', '--weights', '--num-windows']);
  const flagOptions = new Set([
    '--pretty',
    '--normalize',
    '--no-normalize',
    '--filter-stops',
    '--no-filter-stops'
  ]);

  const { positionals, options, flags } = parseCommandArgs(args, valueOptions, flagOptions);

  if (positionals.length !== 2) {
    throw new Error('compare requires exactly 2 positional arguments: <fileA> <fileB>');
  }

  const format = options.get('--format') || 'json';
  if (!['json', 'table'].includes(format)) {
    throw new Error('--format for compare must be json or table');
  }

  const scoreOptions = options.has('--weights')
    ? parseWeights(options.get('--weights'))
    : {};

  const fingerprintOptions = buildFingerprintOptions(options, flags);

  const fileA = await readCodeFile(positionals[0]);
  const fileB = await readCodeFile(positionals[1]);

  const result = compareCodeSnippets(fileA.content, fileB.content, {
    fingerprintOptions,
    scoreOptions,
    includeFingerprints: false
  });

  if (format === 'table') {
    printCompareTable(result);
    return;
  }

  printJson(result, flags.has('--pretty'));
}

async function runFind(args) {
  const valueOptions = new Set([
    '--top-k',
    '--min-score',
    '--ext',
    '--exclude',
    '--max-file-size',
    '--concurrency',
    '--format',
    '--num-windows'
  ]);
  const flagOptions = new Set([
    '--relative',
    '--absolute',
    '--pretty',
    '--normalize',
    '--no-normalize',
    '--filter-stops',
    '--no-filter-stops'
  ]);

  const { positionals, options, flags } = parseCommandArgs(args, valueOptions, flagOptions);

  if (positionals.length !== 2) {
    throw new Error('find requires exactly 2 positional arguments: <queryFile> <rootDir>');
  }

  const format = options.get('--format') || 'table';
  if (!['json', 'table'].includes(format)) {
    throw new Error('--format for find must be json or table');
  }

  const query = await readCodeFile(positionals[0]);
  const rootDir = path.resolve(positionals[1]);

  const fingerprintOptions = buildFingerprintOptions(options, flags);

  const payload = await findSimilarInDirectory(query.content, rootDir, {
    topK: options.has('--top-k') ? parseIntStrict(options.get('--top-k'), '--top-k') : 20,
    minScore: options.has('--min-score') ? parseNumber(options.get('--min-score'), '--min-score') : 0,
    extensions: options.has('--ext') ? parseCsv(options.get('--ext')).map((ext) => ext.startsWith('.') ? ext : `.${ext}`) : undefined,
    excludeDirs: options.has('--exclude') ? parseCsv(options.get('--exclude')) : undefined,
    maxFileSizeBytes: options.has('--max-file-size') ? parseIntStrict(options.get('--max-file-size'), '--max-file-size') : 512000,
    concurrency: options.has('--concurrency') ? parseIntStrict(options.get('--concurrency'), '--concurrency') : 8,
    absolutePaths: flags.has('--relative') ? false : true,
    fingerprintOptions
  });

  if (flags.has('--absolute')) {
    payload.results = payload.results.map((item) => ({ ...item, path: path.resolve(item.path) }));
  }

  if (format === 'table') {
    printFindTable(payload);
    return;
  }

  printJson(payload, flags.has('--pretty'));
}

async function runFingerprint(args) {
  const valueOptions = new Set(['--format', '--num-windows']);
  const flagOptions = new Set([
    '--pretty',
    '--include-vectors',
    '--normalize',
    '--no-normalize',
    '--filter-stops',
    '--no-filter-stops'
  ]);

  const { positionals, options, flags } = parseCommandArgs(args, valueOptions, flagOptions);

  if (positionals.length !== 1) {
    throw new Error('fingerprint requires exactly 1 positional argument: <file>');
  }

  const format = options.get('--format') || 'summary';
  if (!['summary', 'json'].includes(format)) {
    throw new Error('--format for fingerprint must be summary or json');
  }

  const includeVectors = flags.has('--include-vectors');
  const fingerprintOptions = buildFingerprintOptions(options, flags);

  const file = await readCodeFile(positionals[0]);
  const fp = snippetFingerprint(file.content, fingerprintOptions);

  if (format === 'summary') {
    printFingerprintSummary({
      file: file.resolved,
      tokensCount: fp.tokens.length,
      numWindows: fp.numWindows,
      global: fp.global,
      orderSignatureLength: fp.orderSignature.length,
      typeProfileLength: fp.typeProfile.length,
      bigramProfileLength: fp.bigramProfile.length
    });
    return;
  }

  if (includeVectors) {
    printJson({
      ...fp,
      global: { ...fp.global, data: Array.from(fp.global.data) },
      windows: fp.windows.map((win) => ({ ...win, data: Array.from(win.data) })),
      orderSignature: Array.from(fp.orderSignature),
      typeProfile: Array.from(fp.typeProfile),
      bigramProfile: Array.from(fp.bigramProfile)
    }, flags.has('--pretty'));
    return;
  }

  printJson({
    tokens: fp.tokens,
    numWindows: fp.numWindows,
    global: {
      width: fp.global.width,
      height: fp.global.height,
      channels: fp.global.channels,
      dataLength: fp.global.data.length
    },
    windows: fp.windows.map((win) => ({
      width: win.width,
      height: win.height,
      channels: win.channels,
      dataLength: win.data.length
    })),
    orderSignatureLength: fp.orderSignature.length,
    typeProfileLength: fp.typeProfile.length,
    bigramProfileLength: fp.bigramProfile.length
  }, flags.has('--pretty'));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(helpText());
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(readVersion());
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  if (command === 'compare') {
    await runCompare(commandArgs);
    return;
  }

  if (command === 'find') {
    await runFind(commandArgs);
    return;
  }

  if (command === 'fingerprint') {
    await runFingerprint(commandArgs);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(error.message.startsWith('Unknown') || error.message.includes('requires exactly') || error.message.includes('Missing value')
    ? EXIT_INVALID_ARGS
    : EXIT_RUNTIME_ERROR);
});
