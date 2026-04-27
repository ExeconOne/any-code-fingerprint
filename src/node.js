import coreDefault, {
  snippetFingerprint,
  compareFingerprints,
  compareSnippetFingerprints,
  compareCodeSnippets,
  DEFAULT_WEIGHTS,
  normalizeCode,
  classifyToken,
  TOKEN_TYPE,
  KEYWORDS,
  NUM_TOKEN_TYPES,
  tokenize,
  BUILTIN_STOPWORDS
} from './index.js';
import { findSimilarInDirectory } from './node/find-similar-in-directory.js';

export {
  snippetFingerprint,
  compareFingerprints,
  compareSnippetFingerprints,
  compareCodeSnippets,
  findSimilarInDirectory,
  DEFAULT_WEIGHTS,
  normalizeCode,
  classifyToken,
  TOKEN_TYPE,
  KEYWORDS,
  NUM_TOKEN_TYPES,
  tokenize,
  BUILTIN_STOPWORDS
};

export default {
  ...coreDefault,
  findSimilarInDirectory
};
