import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { snippetFingerprint } from '../core/fingerprint.js';
import { compareSnippetFingerprints } from '../core/scorer.js';

const DEFAULT_EXTENSIONS = [
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.py', '.java', '.cs', '.cpp', '.c', '.h', '.hpp',
  '.go', '.php', '.rb', '.rs', '.kt', '.swift', '.scala',
  '.json'
];

const DEFAULT_EXCLUDE_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', '.cache'
]);

function normalizeExtensions(extensions) {
  return new Set((extensions || DEFAULT_EXTENSIONS).map((ext) => ext.toLowerCase()));
}

async function collectFiles(rootDir, extensionSet, excludeDirs) {
  const out = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (excludeDirs.has(entry.name)) continue;
        await walk(path.join(currentDir, entry.name));
        continue;
      }

      if (!entry.isFile()) continue;

      const fullPath = path.join(currentDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      if (extensionSet.has(ext)) out.push(fullPath);
    }
  }

  await walk(rootDir);
  return out;
}

async function mapLimit(items, limit, worker) {
  const batch = Math.max(1, limit);
  const queue = [...items];

  const runners = Array.from({ length: Math.min(batch, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) {
        await worker(item);
      }
    }
  });

  await Promise.all(runners);
}

export async function findSimilarInDirectory(queryCode, rootDir, opts = {}) {
  if (typeof queryCode !== 'string' || queryCode.trim() === '') {
    throw new Error('findSimilarInDirectory: queryCode must be a non-empty string');
  }
  if (typeof rootDir !== 'string' || rootDir.trim() === '') {
    throw new Error('findSimilarInDirectory: rootDir must be a non-empty string path');
  }

  const baseDir = path.resolve(rootDir);
  const extensionSet = normalizeExtensions(opts.extensions);
  const excludeDirs = new Set(opts.excludeDirs || Array.from(DEFAULT_EXCLUDE_DIRS));
  const topK = Number.isInteger(opts.topK) && opts.topK > 0 ? opts.topK : null;
  const minScore = opts.minScore !== undefined ? opts.minScore : 0;
  const maxFileSizeBytes = Number.isInteger(opts.maxFileSizeBytes) ? opts.maxFileSizeBytes : 512000;
  const concurrency = Number.isInteger(opts.concurrency) ? Math.max(1, opts.concurrency) : 8;
  const includeFingerprints = Boolean(opts.includeFingerprints);
  const absolutePaths = opts.absolutePaths !== undefined ? Boolean(opts.absolutePaths) : true;
  const encoding = opts.encoding || 'utf8';

  const fingerprintOptions = opts.fingerprintOptions || {};
  const scoreOptions = opts.scoreOptions || {};

  const queryFingerprint = snippetFingerprint(queryCode, fingerprintOptions);
  const files = await collectFiles(baseDir, extensionSet, excludeDirs);

  const results = [];
  const errors = [];

  await mapLimit(files, concurrency, async (filePath) => {
    try {
      const fileStat = await stat(filePath);
      if (fileStat.size > maxFileSizeBytes) return;

      const code = await readFile(filePath, encoding);
      const fingerprint = snippetFingerprint(code, fingerprintOptions);
      const comparison = compareSnippetFingerprints(queryFingerprint, fingerprint, scoreOptions);

      if (comparison.score < minScore) return;

      results.push({
        path: absolutePaths ? filePath : path.relative(baseDir, filePath),
        ...comparison,
        ...(includeFingerprints ? { fingerprint } : {})
      });
    } catch (error) {
      errors.push({
        path: absolutePaths ? filePath : path.relative(baseDir, filePath),
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  results.sort((a, b) => b.score - a.score);
  const finalResults = topK ? results.slice(0, topK) : results;

  return {
    rootDir: baseDir,
    scannedFiles: files.length,
    matchedFiles: finalResults.length,
    results: finalResults,
    errors,
    ...(includeFingerprints ? { queryFingerprint } : {})
  };
}
