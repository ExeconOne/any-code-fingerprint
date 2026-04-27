const DEFAULT_SIGMA_TOK = 0.15;

export class Sequence2TensorEncoder {
  constructor(tokenEncoder, opts = {}) {
    this.encoder = tokenEncoder;
    this.temporalBins = opts.temporalBins !== undefined ? opts.temporalBins : tokenEncoder.W;
    this.sigmaTok = opts.sigmaTok !== undefined ? opts.sigmaTok : DEFAULT_SIGMA_TOK;

    if (this.temporalBins < 1) {
      throw new RangeError('Sequence2TensorEncoder: temporalBins must be >= 1');
    }
    if (this.sigmaTok <= 0) {
      throw new RangeError('Sequence2TensorEncoder: sigmaTok must be > 0');
    }
  }

  get imageShape() {
    return [this.encoder.H, this.encoder.W, 3];
  }

  encode(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new Error('Sequence2TensorEncoder.encode: tokens must be a non-empty array');
    }

    const count = tokens.length;
    const width = this.encoder.W;
    const height = this.encoder.H;
    const bins = this.temporalBins;
    const sigmaTok = this.sigmaTok;
    const sig2 = 2 * sigmaTok * sigmaTok;

    const encoded = tokens.map((token) => this.encoder.encode(token));

    const positions = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i] = (i + 0.5) / count;
    }

    const kernels = new Array(bins);
    for (let bin = 0; bin < bins; bin += 1) {
      const center = (bin + 0.5) / bins;
      const raw = new Float32Array(count);
      let sum = 0;

      for (let i = 0; i < count; i += 1) {
        const d = positions[i] - center;
        raw[i] = Math.exp(-(d * d) / sig2);
        sum += raw[i];
      }

      if (sum < 1e-12) {
        const equal = 1 / count;
        for (let i = 0; i < count; i += 1) raw[i] = equal;
      } else {
        for (let i = 0; i < count; i += 1) raw[i] /= sum;
      }

      kernels[bin] = raw;
    }

    const result = new Float32Array(height * width * 3);
    for (let col = 0; col < width; col += 1) {
      const bin = Math.min(bins - 1, Math.floor((col * bins) / width));
      const weights = kernels[bin];

      for (let row = 0; row < height; row += 1) {
        const base = (row * width + col) * 3;
        let r = 0;
        let g = 0;
        let b = 0;

        for (let i = 0; i < count; i += 1) {
          const w = weights[i];
          const data = encoded[i].data;
          r += w * data[base];
          g += w * data[base + 1];
          b += w * data[base + 2];
        }

        result[base] = r;
        result[base + 1] = g;
        result[base + 2] = b;
      }
    }

    return { data: result, width, height, channels: 3 };
  }
}
