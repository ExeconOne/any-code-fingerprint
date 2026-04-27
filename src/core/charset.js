const CHARSET = 'abcdefghijklmnopqrstuvwxyząćęłńóśźż0123456789 _-./@#';
const CHARSET_SIZE = CHARSET.length + 1;
const VOWELS = new Set('aeiouąęó');

export function charIndex(char) {
  const lower = char.toLowerCase();
  const index = CHARSET.indexOf(lower);
  return index >= 0 ? index : CHARSET.length;
}

export function isVowel(char) {
  return VOWELS.has(char.toLowerCase());
}

export { CHARSET, CHARSET_SIZE };
