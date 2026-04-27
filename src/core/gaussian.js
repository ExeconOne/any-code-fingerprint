export function addGaussian(canvas, centerX, centerY, sigmaX, sigmaY, width, height, amplitude = 1.0) {
  const sx = Math.max(sigmaX, 1.0);
  const sy = Math.max(sigmaY, 1.0);
  const radius = 3;

  const xMin = Math.max(0, Math.floor(centerX - radius * sx));
  const xMax = Math.min(width - 1, Math.ceil(centerX + radius * sx));
  const yMin = Math.max(0, Math.floor(centerY - radius * sy));
  const yMax = Math.min(height - 1, Math.ceil(centerY + radius * sy));

  const inv2sx2 = 1 / (2 * sx * sx);
  const inv2sy2 = 1 / (2 * sy * sy);

  for (let row = yMin; row <= yMax; row += 1) {
    const dy = row - centerY;
    const gy = Math.exp(-(dy * dy) * inv2sy2);
    const rowBase = row * width;

    for (let col = xMin; col <= xMax; col += 1) {
      const dx = col - centerX;
      canvas[rowBase + col] += amplitude * Math.exp(-(dx * dx) * inv2sx2) * gy;
    }
  }
}

export function normalizeCanvas(canvas) {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < canvas.length; i += 1) {
    if (canvas[i] < min) min = canvas[i];
    if (canvas[i] > max) max = canvas[i];
  }

  const range = max - min;
  if (range === 0) return canvas;

  const invRange = 1 / range;
  for (let i = 0; i < canvas.length; i += 1) {
    canvas[i] = (canvas[i] - min) * invRange;
  }

  return canvas;
}
