const DEFAULT_MU = [1.0, 0.8, 0.2];
const DEFAULT_ALPHA = 40.0;
const DEFAULT_POWER = 2.0;
const DEFAULT_MEAN_CENTER = true;
const DEFAULT_SHIFT_FRAC = 0.16;

export class ImageSimilarity {
  constructor(opts = {}) {
    this.mu = opts.mu || DEFAULT_MU;
    this.alpha = opts.alpha !== undefined ? opts.alpha : DEFAULT_ALPHA;
    this.power = opts.power !== undefined ? opts.power : DEFAULT_POWER;
    this.shiftFrac = opts.shiftFrac !== undefined ? opts.shiftFrac : DEFAULT_SHIFT_FRAC;
    this.meanCenter = opts.meanCenter !== undefined ? opts.meanCenter : DEFAULT_MEAN_CENTER;
  }

  distance(imgA, imgB) {
    assertCompatible(imgA, imgB);

    const width = imgA.width;
    const height = imgA.height;
    const pixelCount = width * height;
    const maxShift = Math.max(1, Math.round(this.shiftFrac * width));

    const a = [new Float32Array(pixelCount), new Float32Array(pixelCount), new Float32Array(pixelCount)];
    const b = [new Float32Array(pixelCount), new Float32Array(pixelCount), new Float32Array(pixelCount)];

    for (let px = 0; px < pixelCount; px += 1) {
      const base = px * 3;
      a[0][px] = imgA.data[base];
      a[1][px] = imgA.data[base + 1];
      a[2][px] = imgA.data[base + 2];
      b[0][px] = imgB.data[base];
      b[1][px] = imgB.data[base + 1];
      b[2][px] = imgB.data[base + 2];
    }

    if (this.meanCenter) {
      for (let channel = 0; channel < 3; channel += 1) {
        subtractMean(a[channel], pixelCount);
        subtractMean(b[channel], pixelCount);
      }
    }

    let distSum = 0;
    let weightSum = 0;

    for (let channel = 0; channel < 3; channel += 1) {
      const cos = channel === 0
        ? maxShiftCosSim(a[0], b[0], width, height, maxShift)
        : cosSim(a[channel], b[channel], pixelCount);

      const dist = this.meanCenter ? (1 - cos) * 0.5 : (1 - cos);
      distSum += this.mu[channel] * dist;
      weightSum += this.mu[channel];
    }

    return distSum / weightSum;
  }

  similarity(imgA, imgB) {
    const distance = this.distance(imgA, imgB);
    return Math.exp(-this.alpha * Math.pow(distance, this.power));
  }
}

function subtractMean(flat, len) {
  let sum = 0;
  for (let i = 0; i < len; i += 1) sum += flat[i];
  const mean = sum / len;
  for (let i = 0; i < len; i += 1) flat[i] -= mean;
}

function cosSim(flatA, flatB, len) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    dot += flatA[i] * flatB[i];
    normA += flatA[i] * flatA[i];
    normB += flatB[i] * flatB[i];
  }

  if (normA < 1e-12 && normB < 1e-12) return 1.0;
  if (normA < 1e-12 || normB < 1e-12) return 0.0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function shiftedCosSim(flatA, flatB, width, height, shift) {
  const colMin = Math.max(0, -shift);
  const colMax = Math.min(width, width - shift);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let row = 0; row < height; row += 1) {
    const rowBase = row * width;

    for (let col = colMin; col < colMax; col += 1) {
      const a = flatA[rowBase + col];
      const b = flatB[rowBase + col + shift];
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }
  }

  if (normA < 1e-12 && normB < 1e-12) return 1.0;
  if (normA < 1e-12 || normB < 1e-12) return 0.0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function maxShiftCosSim(flatA, flatB, width, height, maxShift) {
  let best = -Infinity;

  for (let shift = -maxShift; shift <= maxShift; shift += 1) {
    const value = shiftedCosSim(flatA, flatB, width, height, shift);
    if (value > best) best = value;
  }

  return best;
}

function assertCompatible(imgA, imgB) {
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(
      `ImageSimilarity: incompatible image sizes [${imgA.height}x${imgA.width}] vs [${imgB.height}x${imgB.width}]`
    );
  }
}
