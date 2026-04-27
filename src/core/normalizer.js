export const KEYWORDS = new Set([
  'function', 'return', 'const', 'let', 'var', 'class', 'new', 'this',
  'import', 'export', 'default', 'from', 'require', 'module', 'exports',
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case',
  'true', 'false', 'null', 'undefined', 'void', 'typeof', 'instanceof', 'in', 'of',
  'try', 'catch', 'throw', 'finally', 'async', 'await', 'yield', 'delete',
  'def', 'self', 'pass', 'none', 'with', 'lambda', 'as', 'raise', 'except', 'elif',
  'public', 'private', 'protected', 'static', 'abstract', 'override', 'final',
  'extends', 'implements', 'interface', 'boolean', 'char', 'byte', 'short',
  'long', 'float', 'double', 'int', 'string', 'bool',
  'and', 'or', 'not', 'is', 'type', 'enum', 'struct', 'union',
  'num', 'str', 'var'
]);

const SINGLE_LETTER_VARS = new Set('ijklmnpqrstuvwxyz'.split(''));

export const TOKEN_TYPE = Object.freeze({
  KEYWORD: 0,
  IDENTIFIER: 1,
  NUM: 2,
  STR: 3
});

export const NUM_TOKEN_TYPES = 4;

export function normalizeCode(code) {
  let normalized = code;

  normalized = normalized.replace(/`(?:[^`\\]|\\.)*`/g, ' STR ');
  normalized = normalized.replace(/"(?:[^"\\]|\\.)*"/g, ' STR ');
  normalized = normalized.replace(/'(?:[^'\\]|\\.)*'/g, ' STR ');
  normalized = normalized.replace(/\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, ' NUM ');
  normalized = normalized.replace(/\b([a-z])\b/g, (_, letter) => (
    SINGLE_LETTER_VARS.has(letter) ? 'VAR' : letter
  ));

  return normalized;
}

export function classifyToken(token) {
  if (token === 'num') return TOKEN_TYPE.NUM;
  if (token === 'str') return TOKEN_TYPE.STR;
  if (KEYWORDS.has(token)) return TOKEN_TYPE.KEYWORD;
  return TOKEN_TYPE.IDENTIFIER;
}
