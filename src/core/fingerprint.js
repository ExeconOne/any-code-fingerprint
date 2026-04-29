import { Word2TensorEncoder } from './encoder.js';
import { Sequence2TensorEncoder } from './sequence.js';
import { BUILTIN_STOPWORDS, tokenize } from './tokenizer.js';
import { normalizeCode, classifyToken, NUM_TOKEN_TYPES } from './normalizer.js';

const IMG_W = 64;
const IMG_H = 64;
const encoder = new Word2TensorEncoder(IMG_W, IMG_H);

export const DEFAULT_NUM_WINDOWS = 4;
export const BIGRAM_BUCKETS = 64;

function encodeWindow(tokens) {
  if (tokens.length === 0) {
    return { data: new Float32Array(IMG_H * IMG_W * 3), width: IMG_W, height: IMG_H, channels: 3 };
  }
  return new Sequence2TensorEncoder(encoder).encode(tokens);
}

function splitIntoWindows(tokens, numWindows) {
  const n = tokens.length;
  const windows = [];

  for (let w = 0; w < numWindows; w += 1) {
    const start = Math.floor((w * n) / numWindows);
    const end = Math.floor(((w + 1) * n) / numWindows);
    windows.push(tokens.slice(start, end));
  }

  return windows;
}

function computeOrderSignature(tokenTypes) {
  const size = NUM_TOKEN_TYPES * NUM_TOKEN_TYPES;
  const counts = new Float32Array(size);

  for (let i = 0; i < tokenTypes.length - 1; i += 1) {
    counts[tokenTypes[i] * NUM_TOKEN_TYPES + tokenTypes[i + 1]] += 1;
  }

  let total = 0;
  for (let i = 0; i < size; i += 1) total += counts[i];
  if (total > 0) {
    for (let i = 0; i < size; i += 1) counts[i] /= total;
  }

  return counts;
}

function computeTypeProfile(tokenTypes, numWindows) {
  const n = tokenTypes.length;
  const profile = new Float32Array(numWindows * NUM_TOKEN_TYPES);

  for (let w = 0; w < numWindows; w += 1) {
    const start = Math.floor((w * n) / numWindows);
    const end = Math.floor(((w + 1) * n) / numWindows);
    const offset = w * NUM_TOKEN_TYPES;
    const count = end - start;

    for (let i = start; i < end; i += 1) {
      profile[offset + tokenTypes[i]] += 1;
    }

    if (count > 0) {
      for (let type = 0; type < NUM_TOKEN_TYPES; type += 1) {
        profile[offset + type] /= count;
      }
    }
  }

  return profile;
}

function computeBigramProfile(tokens) {
  const buckets = new Float32Array(BIGRAM_BUCKETS);

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const t1 = tokens[i];
    const t2 = tokens[i + 1];

    let hash = 5381;
    for (let j = 0; j < t1.length; j += 1) hash = ((hash * 33) ^ t1.charCodeAt(j)) | 0;
    hash = (hash * 67) | 0;
    for (let j = 0; j < t2.length; j += 1) hash = ((hash * 33) ^ t2.charCodeAt(j)) | 0;

    buckets[Math.abs(hash) % BIGRAM_BUCKETS] += 1;
  }

  let total = 0;
  for (let i = 0; i < BIGRAM_BUCKETS; i += 1) total += buckets[i];
  if (total > 0) {
    for (let i = 0; i < BIGRAM_BUCKETS; i += 1) buckets[i] /= total;
  }

  return buckets;
}

export function snippetFingerprint(code, opts = {}) {
  const numWindows = opts.numWindows !== undefined ? opts.numWindows : DEFAULT_NUM_WINDOWS;
  const normalize = opts.normalize !== undefined ? opts.normalize : true;
  const filterStops = opts.filterStops !== undefined ? opts.filterStops : true;

  const normalized = normalize ? normalizeCode(code) : code;
  const rawTokens = tokenize(normalized, { ordered: true });

  if (rawTokens.length === 0) {
    throw new Error('snippetFingerprint: no tokens found in code snippet');
  }

  const tokenTypes = rawTokens.map((token) => classifyToken(token));
  const neverFilter = new Set(['num', 'str', 'var']);
  const seqTokens = filterStops
    ? rawTokens.filter((token) => !BUILTIN_STOPWORDS.has(token) || neverFilter.has(token))
    : rawTokens;

  const encodingTokens = seqTokens.length > 0 ? seqTokens : rawTokens;

  const global = new Sequence2TensorEncoder(encoder).encode(encodingTokens);
  const windowSlices = splitIntoWindows(encodingTokens, numWindows);
  const windows = windowSlices.map((windowTokens) => encodeWindow(windowTokens));

  const orderSignature = computeOrderSignature(tokenTypes);
  const typeProfile = computeTypeProfile(tokenTypes, numWindows);
  const bigramProfile = computeBigramProfile(rawTokens);

  return {
    global,
    windows,
    orderSignature,
    typeProfile,
    bigramProfile,
    tokens: rawTokens,
    numWindows
  };
}
