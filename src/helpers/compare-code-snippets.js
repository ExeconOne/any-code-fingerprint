import { snippetFingerprint } from '../core/fingerprint.js';
import { compareSnippetFingerprints } from '../core/scorer.js';

export function compareCodeSnippets(codeA, codeB, opts = {}) {
  const fingerprintOptions = opts.fingerprintOptions || {};
  const fingerprintOptionsA = opts.fingerprintOptionsA || fingerprintOptions;
  const fingerprintOptionsB = opts.fingerprintOptionsB || fingerprintOptions;
  const scoreOptions = opts.scoreOptions || {};
  const includeFingerprints = Boolean(opts.includeFingerprints);

  const fingerprintA = snippetFingerprint(codeA, fingerprintOptionsA);
  const fingerprintB = snippetFingerprint(codeB, fingerprintOptionsB);
  const comparison = compareSnippetFingerprints(fingerprintA, fingerprintB, scoreOptions);

  if (!includeFingerprints) {
    return comparison;
  }

  return {
    ...comparison,
    fingerprintA,
    fingerprintB
  };
}
