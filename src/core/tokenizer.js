export const BUILTIN_STOPWORDS = new Set([
  'function', 'return', 'const', 'let', 'var', 'class', 'new', 'this',
  'import', 'export', 'exports', 'module', 'require', 'default',
  'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case',
  'true', 'false', 'null', 'undefined', 'void', 'typeof', 'instanceof',
  'try', 'catch', 'throw', 'finally', 'async', 'await', 'yield',
  'def', 'self', 'pass', 'none', 'from', 'with', 'lambda',
  'public', 'private', 'static', 'int', 'string', 'bool',
  'and', 'not', 'use', 'get', 'set', 'add', 'has', 'map', 'all',
  'the', 'are', 'its', 'was', 'can', 'via',
  'lub', 'nie', 'dla', 'tak', 'czy', 'jak', 'ten', 'tego', 'tylko',
  'strict', 'prototype', 'length', 'push', 'pop', 'slice', 'splice'
]);

export function tokenize(text, opts = {}) {
  const ordered = Boolean(opts.ordered);

  const tokens = [...new Set(
    text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźż]+/g, ' ')
      .split(/\s+/)
      .flatMap((token) => token.split('_'))
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  )];

  return ordered ? tokens : tokens.sort();
}
