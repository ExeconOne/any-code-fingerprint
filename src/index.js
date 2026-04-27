import { snippetFingerprint } from './core/fingerprint.js';
import { compareSnippetFingerprints, DEFAULT_WEIGHTS } from './core/scorer.js';
import { compareCodeSnippets } from './helpers/compare-code-snippets.js';

export { snippetFingerprint };
export { compareSnippetFingerprints };
export const compareFingerprints = compareSnippetFingerprints;

export { compareCodeSnippets };
export { DEFAULT_WEIGHTS };

export { normalizeCode, classifyToken, TOKEN_TYPE, KEYWORDS, NUM_TOKEN_TYPES } from './core/normalizer.js';
export { tokenize, BUILTIN_STOPWORDS } from './core/tokenizer.js';

export default {
  snippetFingerprint,
  compareFingerprints,
  compareSnippetFingerprints,
  compareCodeSnippets
};
