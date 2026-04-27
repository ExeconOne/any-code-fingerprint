import { charIndex, isVowel, CHARSET_SIZE } from './charset.js';
import { addGaussian, normalizeCanvas } from './gaussian.js';

const DEFAULT_OPTS = {
  sigmaPos: 0.05,
  sigmaChar: 0.03,
  sigmaNgram: 0.025,
  maxPrefixSuffix: 4
};

export class Word2TensorEncoder {
  constructor(width = 64, height = 64, opts = {}) {
    if (width < 4 || height < 4) {
      throw new RangeError('Word2TensorEncoder: width and height must be >= 4');
    }

    this.W = width;
    this.H = height;
    this.channels = 3;
    this.options = Object.assign({}, DEFAULT_OPTS, opts);
  }

  get imageShape() {
    return [this.H, this.W, this.channels];
  }

  encode(word) {
    const channelR = buildCharPosChannel(word, this.W, this.H, this.options);
    const channelG = buildNgramChannel(word, this.W, this.H, this.options);
    const channelB = buildGlobalChannel(word, this.W, this.H, this.options);

    normalizeCanvas(channelR);
    normalizeCanvas(channelG);
    normalizeCanvas(channelB);

    const data = new Float32Array(this.H * this.W * 3);
    for (let i = 0; i < this.H * this.W; i += 1) {
      data[i * 3] = channelR[i];
      data[i * 3 + 1] = channelG[i];
      data[i * 3 + 2] = channelB[i];
    }

    return { data, width: this.W, height: this.H, channels: 3 };
  }
}

function buildCharPosChannel(word, width, height, opts) {
  const canvas = new Float32Array(width * height);
  const n = word.length;
  if (n === 0) return canvas;

  const sigmaX = opts.sigmaPos * width;
  const sigmaY = opts.sigmaChar * height;

  for (let i = 0; i < n; i += 1) {
    const centerX = (n === 1 ? 0.5 : i / (n - 1)) * (width - 1);
    const centerY = ((charIndex(word[i]) + 0.5) / CHARSET_SIZE) * (height - 1);
    addGaussian(canvas, centerX, centerY, sigmaX, sigmaY, width, height);
  }

  return canvas;
}

function buildNgramChannel(word, width, height, opts) {
  const canvas = new Float32Array(width * height);
  const sigma = opts.sigmaNgram * Math.min(width, height);

  for (let i = 0; i < word.length - 1; i += 1) {
    const i1 = charIndex(word[i]);
    const i2 = charIndex(word[i + 1]);
    const { x, y } = bigramToXY(i1, i2, width, height);
    addGaussian(canvas, x, y, sigma, sigma, width, height);
  }

  return canvas;
}

function bigramToXY(i1, i2, width, height) {
  const h1 = ((i1 * 67 + i2 * 31 + 7) * 1000003) % width;
  const h2 = ((i1 * 53 + i2 * 97 + 13) * 999983) % height;
  return { x: Math.abs(h1), y: Math.abs(h2) };
}

function buildGlobalChannel(word, width, height, opts) {
  const canvas = new Float32Array(width * height);
  const n = word.length;
  const k = Math.min(opts.maxPrefixSuffix, n);
  const halfH = Math.floor(height / 2);
  const halfW = Math.floor(width / 2);

  if (k > 0) {
    const prefix = word.slice(0, k);
    const suffix = word.slice(-k);
    const leftSlot = Math.max(1, Math.floor(halfW / k));
    const rightSlot = Math.max(1, Math.floor((width - halfW) / k));

    for (let p = 0; p < prefix.length; p += 1) {
      const val = (charIndex(prefix[p]) + 1) / (CHARSET_SIZE + 1);
      const colStart = p * leftSlot;
      const colEnd = Math.min(halfW, colStart + leftSlot);

      for (let row = 0; row < halfH; row += 1) {
        for (let col = colStart; col < colEnd; col += 1) {
          canvas[row * width + col] = val;
        }
      }
    }

    for (let s = 0; s < suffix.length; s += 1) {
      const val = (charIndex(suffix[s]) + 1) / (CHARSET_SIZE + 1);
      const colStart = halfW + s * rightSlot;
      const colEnd = Math.min(width, colStart + rightSlot);

      for (let row = 0; row < halfH; row += 1) {
        for (let col = colStart; col < colEnd; col += 1) {
          canvas[row * width + col] = val;
        }
      }
    }
  }

  const maxLen = 50;
  const stats = [
    Math.min(n / maxLen, 1.0),
    n > 0 ? [...word].filter((char) => isVowel(char)).length / n : 0,
    shannonEntropy(word),
    n > 0 ? new Set([...word.toLowerCase()]).size / Math.min(n, CHARSET_SIZE) : 0
  ];

  const barHeight = Math.max(1, Math.floor((height - halfH) / stats.length));
  for (let i = 0; i < stats.length; i += 1) {
    const rowStart = halfH + i * barHeight;
    const rowEnd = Math.min(height, rowStart + barHeight);

    for (let row = rowStart; row < rowEnd; row += 1) {
      const base = row * width;
      for (let col = 0; col < width; col += 1) {
        canvas[base + col] = stats[i];
      }
    }
  }

  return canvas;
}

function shannonEntropy(word) {
  if (word.length === 0) return 0;

  const freq = {};
  for (const char of word.toLowerCase()) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const n = word.length;
  for (const count of Object.values(freq)) {
    const p = count / n;
    entropy -= p * Math.log2(p);
  }

  const maxEntropy = Math.log2(Math.min(n, CHARSET_SIZE));
  return maxEntropy > 0 ? Math.min(entropy / maxEntropy, 1.0) : 0;
}
