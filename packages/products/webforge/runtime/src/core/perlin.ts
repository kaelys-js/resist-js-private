/**
 * Lightweight 2D Perlin noise implementation.
 *
 * Deterministic — same (x, y) always produces the same output.
 * Returns values in the range [-1, 1].
 *
 * Based on the improved Perlin noise algorithm (Ken Perlin, 2002).
 *
 * @example
 * ```typescript
 * const value = perlin2d(3.14, 2.71); // deterministic float in [-1, 1]
 * ```
 *
 * @module
 */

/* eslint-disable max-lines-per-function */

/** Permutation table (doubled for wrapping). */
const PERM: readonly number[] = (() => {
  const p: number[] = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
    142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
    203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
    220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
    132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186,
    3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59,
    227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70,
    221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178,
    185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81,
    51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115,
    121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195,
    78, 66, 215, 61, 156, 180,
  ];
  return [...p, ...p];
})();

/**
 * Fade function — 6t^5 - 15t^4 + 10t^3 (Perlin improved).
 *
 * @param t - Input value, typically in [0, 1].
 * @returns Smoothed value.
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation.
 *
 * @param a - Start value.
 * @param b - End value.
 * @param t - Interpolation factor in [0, 1].
 * @returns Interpolated value.
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Gradient function — dot product of gradient vector and distance vector.
 *
 * @param hash - Hash value selecting the gradient.
 * @param x - X distance from grid corner.
 * @param y - Y distance from grid corner.
 * @returns Dot product of gradient and distance.
 */
function grad(hash: number, x: number, y: number): number {
  const h: number = hash & 3;
  const u: number = h < 2 ? x : y;
  const v: number = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * Safe lookup into the permutation table. Returns 0 for out-of-range indices.
 *
 * @param index - Array index to look up.
 * @returns The permutation value, or 0 if the index is out of range.
 */
function perm(index: number): number {
  return PERM[index] ?? 0;
}

/**
 * Computes 2D Perlin noise at the given coordinates.
 *
 * Deterministic — same (x, y) always produces the same output.
 * Returns values in the range [-1, 1].
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @returns Noise value in the range [-1, 1].
 *
 * @example
 * ```typescript
 * const value = perlin2d(3.14, 2.71); // deterministic float in [-1, 1]
 * ```
 */
export function perlin2d(x: number, y: number): number {
  // Find unit grid cell
  const xi: number = Math.floor(x) & 255;
  const yi: number = Math.floor(y) & 255;

  // Relative position within cell
  const xf: number = x - Math.floor(x);
  const yf: number = y - Math.floor(y);

  // Fade curves
  const u: number = fade(xf);
  const v: number = fade(yf);

  // Hash corners
  const aa: number = perm(perm(xi) + yi);
  const ab: number = perm(perm(xi) + yi + 1);
  const ba: number = perm(perm(xi + 1) + yi);
  const bb: number = perm(perm(xi + 1) + yi + 1);

  // Blend
  return lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v,
  );
}

/* eslint-enable max-lines-per-function */
