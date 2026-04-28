import { ImageSimilarity } from './similarity.js';

const similarity = new ImageSimilarity();

export const DEFAULT_WEIGHTS = Object.freeze({
  wGlobal: 0.4,
  wLocal: 0.3,
  wOrder: 0.15,
  wType: 0.15,
  wBigram: 0.2
});

function rawCos(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA < 1e-12 && normB < 1e-12) return 1.0;
  if (normA < 1e-12 || normB < 1e-12) return 0.0;

  const value = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, value));
}

function cosToSim(cos) {
  return (cos + 1) * 0.5;
}

function globalSim(globalA, globalB) {
  return similarity.similarity(globalA, globalB);
}

function localAlignmentSim(windowsA, windowsB) {
  const n = Math.min(windowsA.length, windowsB.length);
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += similarity.similarity(windowsA[i], windowsB[i]);
  }

  return sum / n;
}

function orderSim(sigA, sigB) {
  return cosToSim(rawCos(sigA, sigB));
}

function typeSim(profileA, profileB) {
  return cosToSim(rawCos(profileA, profileB));
}

function bigramSim(profileA, profileB) {
  return rawCos(profileA, profileB);
}

export function compareSnippetFingerprints(fpA, fpB, opts = {}) {
  const wGlobal = opts.wGlobal !== undefined ? opts.wGlobal : DEFAULT_WEIGHTS.wGlobal;
  const wLocal = opts.wLocal !== undefined ? opts.wLocal : DEFAULT_WEIGHTS.wLocal;
  const wOrder = opts.wOrder !== undefined ? opts.wOrder : DEFAULT_WEIGHTS.wOrder;
  const wType = opts.wType !== undefined ? opts.wType : DEFAULT_WEIGHTS.wType;
  const wBigram = opts.wBigram !== undefined ? opts.wBigram : DEFAULT_WEIGHTS.wBigram;

  const sim_global = globalSim(fpA.global, fpB.global);
  const sim_local_alignment = localAlignmentSim(fpA.windows, fpB.windows);
  const sim_order = orderSim(fpA.orderSignature, fpB.orderSignature);
  const sim_type = typeSim(fpA.typeProfile, fpB.typeProfile);
  const sim_bigram = bigramSim(fpA.bigramProfile, fpB.bigramProfile);

  const wSum = wGlobal + wLocal + wOrder + wType + wBigram;
  const score = wSum > 0
    ? (
      (wGlobal * sim_global) +
      (wLocal * sim_local_alignment) +
      (wOrder * sim_order) +
      (wType * sim_type) +
      (wBigram * sim_bigram)
    ) / wSum
    : 0;

  return { sim_global, sim_local_alignment, sim_order, sim_type, sim_bigram, score };
}
